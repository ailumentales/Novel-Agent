// MCP服务实现 - 简化版本，专注于工具调用功能

// 定义数字乘法工具的输入参数接口
export interface MultiplyParams {
  a: number;
  b: number;
}

// 定义工具元数据接口
export interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

// 定义数字乘法工具的元数据
export const multiplyToolMetadata: ToolMetadata = {
  name: 'multiply',
  description: '计算两个数字的乘积',
  parameters: {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        description: '第一个数字'
      },
      b: {
        type: 'number',
        description: '第二个数字'
      }
    },
    required: ['a', 'b']
  }
};

// 实现数字乘法工具函数
async function multiply(params: MultiplyParams): Promise<number> {
  return params.a * params.b;
}

// MCP服务类，用于管理工具调用
class MCPService {
  private tools: Map<string, (params: any) => Promise<any>> = new Map();
  private toolMetadata: Map<string, ToolMetadata> = new Map();

  constructor() {
    // 注册内置工具
    this.registerTool(multiplyToolMetadata, multiply);
  }

  /**
   * 注册工具
   * @param metadata 工具元数据
   * @param handler 工具处理函数
   */
  registerTool(metadata: ToolMetadata, handler: (params: any) => Promise<any>): void {
    this.tools.set(metadata.name, handler);
    this.toolMetadata.set(metadata.name, metadata);
  }

  /**
   * 获取所有已注册工具的元数据
   * @returns ToolMetadata[] 工具元数据列表
   */
  getToolsMetadata(): ToolMetadata[] {
    return Array.from(this.toolMetadata.values());
  }

  /**
   * 调用工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns Promise<any> 工具调用结果
   */
  async callTool(toolName: string, params: any): Promise<any> {
    console.log(`[MCP] 接收到工具调用请求: ${toolName}`);
    console.log(`[MCP] 工具参数:`, JSON.stringify(params));
    
    const handler = this.tools.get(toolName);
    if (!handler) {
      throw new Error(`未知的工具: ${toolName}`);
    }
    
    const result = await handler(params);
    console.log(`[MCP] 工具调用结果: ${result}`);
    
    return result;
  }

  /**
   * 直接调用数字乘法工具（用于测试和直接调用）
   * @param a 第一个数字
   * @param b 第二个数字
   * @returns Promise<number> 乘积结果
   */
  async callMultiply(a: number, b: number): Promise<number> {
    return multiply({ a, b });
  }
}

/**
 * 创建MCP服务实例的工具函数
 * @returns MCPService MCP服务实例
 */
export function createMCPService(): MCPService {
  return new MCPService();
}

/**
 * 创建一个模拟的MCP服务实例（用于开发和测试）
 * @returns MCPService 模拟的MCP服务实例
 */
export function createMockMCPService(): MCPService {
  return new MCPService();
}
