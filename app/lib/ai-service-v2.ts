
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool, StructuredTool } from '@langchain/core/tools';
import { createMCPService } from './mcp-service';
import { OpenAIMessage } from './ai-service';

// MCP工具调用服务实例
const mcpService = createMCPService();

// 定义AI服务配置接口
export interface AIServiceV2Config {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // 工具调用配置
  enableTools?: boolean;
  tools?: StructuredTool[];
}

// AI服务类，使用LangChain.js实现
export class AIServiceV2 {
  private chatModel: ChatOpenAI;
  private defaultConfig: AIServiceV2Config;
  private tools: StructuredTool[];

  constructor(config: AIServiceV2Config) {
    // 从MCP服务获取所有已注册的工具定义
    const mcpToolsMetadata = mcpService.getToolsMetadata();
    
    // 将MCP工具转换为LangChain工具
    this.tools = [];
    for (const toolMetadata of mcpToolsMetadata) {
      try {
        // 直接创建工具对象
        const newTool: any = {
          name: toolMetadata.name,
          description: toolMetadata.description,
          schema: toolMetadata.parameters,
          async invoke(input: any) {
            const result = await mcpService.callTool(toolMetadata.name, input);
            return JSON.stringify(result);
          }
        };
        this.tools.push(newTool);
        console.log(`成功创建工具: ${toolMetadata.name}`);
      } catch (error) {
        console.error(`创建工具 ${toolMetadata.name} 失败:`, error);
      }
    }

    this.defaultConfig = {
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 32768,
      enableTools: true, 
      tools: this.tools,
      ...config
    };

    // 初始化LangChain ChatOpenAI模型
    this.chatModel = new ChatOpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      modelName: this.defaultConfig.model!,
      temperature: this.defaultConfig.temperature,
      maxTokens: this.defaultConfig.maxTokens,
    });
  }

  // 将OpenAIMessage转换为LangChain BaseMessage
  private convertToBaseMessage(messages: OpenAIMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          if (msg.tool_call) {
            return new AIMessage({
              content: '',
              tool_calls: [msg.tool_call]
            });
          }
          return new AIMessage(msg.content);
        case 'tool':
          return new ToolMessage({
            content: msg.content,
            tool_call_id: msg.tool_call_id || ''
          });
        default:
          throw new Error(`未知的消息角色: ${msg.role}`);
      }
    });
  }

  /**
   * 一次性读取AI响应（非流式）
   * @param messages 对话消息列表
   * @param options 可选配置
   * @returns Promise<string> AI响应内容
   */
  async sendMessage(messages: OpenAIMessage[], options?: Partial<AIServiceV2Config>): Promise<string> {
    const config = { ...this.defaultConfig, ...options };
    const baseMessages = this.convertToBaseMessage(messages);

    try {
      // 配置模型是否使用工具
      const modelWithTools = config.enableTools 
        ? this.chatModel.bindTools(config.tools!) 
        : this.chatModel;

      const response = await modelWithTools.invoke(baseMessages);
      
      // 处理工具调用
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          if (toolCall.type === 'tool_call' && toolCall.name) {
            try {
              const toolName = toolCall.name;
              const toolParams = toolCall.args || {};
              
              // 调用工具
              const toolResult = await mcpService.callTool(toolName, toolParams);
              
              // 更新消息列表，包含工具调用和结果
              messages.push(
                {
                  role: 'assistant',
                  content: '',
                  tool_call: toolCall
                },
                {
                  role: 'tool',
                  content: JSON.stringify(toolResult),
                  tool_call_id: toolCall.id
                }
              );
              
              // 递归调用，获取AI对工具结果的响应
              return this.sendMessage(messages, options);
            } catch (error) {
              console.error('工具调用处理失败:', error);
              throw error;
            }
          }
        }
      }
      
      // 处理content可能是数组的情况
      const content = response.content;
      if (Array.isArray(content)) {
        return content.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('');
      }
      return String(content || '');
    } catch (error) {
      console.error('AI一次性请求失败:', error);
      throw error;
    }
  }

  /**
   * 创建适合Next.js API路由的SSE响应
   * @param request Request对象
   * @param messages 对话消息列表
   * @param options 可选配置
   * @returns Response SSE响应对象
   */
  async createSSEResponse(
    request: Request,
    messages: OpenAIMessage[],
    options?: Partial<AIServiceV2Config>
  ): Promise<Response> {
    const config = { ...this.defaultConfig, ...options };
    const baseMessages = this.convertToBaseMessage(messages);

    try {
      // 配置模型是否使用工具
      const modelWithTools = config.enableTools 
        ? this.chatModel.bindTools(config.tools!) 
        : this.chatModel;

      // 创建SSE响应
      const self = this; // 创建SSE响应
      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let accumulatedContent = '';

            try {
              // 处理模型输出流
              const stream = await modelWithTools.stream(baseMessages);
              
              for await (const chunk of stream) {
                if (chunk.content) {
                  accumulatedContent += chunk.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`));
                }

                // 处理工具调用
                if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                  for (const toolCall of chunk.tool_calls) {
                    if (toolCall.type === 'tool_call' && toolCall.name) {
                      try {
                        const toolName = toolCall.name;
                        const toolParams = toolCall.args || {};
                        
                        
                        // 调用工具
                        const toolResult = await mcpService.callTool(toolName, toolParams);
                        
                        // 将工具调用结果发送给客户端
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ toolCallResult: JSON.stringify(toolResult) })}\n\n`));
                        
                        // 更新消息列表，包含工具调用和结果
                        messages.push(
                          {
                            role: 'assistant',
                            content: '',
                            tool_call: toolCall
                          },
                          {
                            role: 'tool',
                            content: JSON.stringify(toolResult),
                            tool_call_id: toolCall.id
                          }
                        );
                        
                        // 递归调用，获取AI对工具结果的响应
                        const followupBaseMessages = self.convertToBaseMessage(messages);
                        const followupStream = await modelWithTools.stream(followupBaseMessages);
                        
                        // 处理后续的响应流
                        accumulatedContent = '';
                        for await (const followupChunk of followupStream) {
                          if (followupChunk.content) {
                            accumulatedContent += followupChunk.content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: followupChunk.content })}\n\n`));
                          }
                        }
                      } catch (error) {
                        console.error('工具调用处理失败:', error);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '工具调用处理失败' })}\n\n`));
                      }
                    }
                  }
                }
              }
              
              // 发送结束信号
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              console.error('SSE流处理失败:', error);
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    } catch (error) {
      console.error('创建SSE响应失败:', error);
      
      return new Response(JSON.stringify({ error: 'AI请求失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

/**
 * 创建AI服务实例的工具函数
 * @param config 可选的配置参数
 * @returns AIServiceV2 AI服务实例
 */
export function createAIServiceV2(config?: Partial<AIServiceV2Config>): AIServiceV2 {
  return new AIServiceV2(config || {});
}
