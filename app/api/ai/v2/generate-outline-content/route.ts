import { createAIServiceV2 } from '@/app/lib/ai-service-v2';
import { OpenAIMessage } from '@/app/lib/ai-service';
import { NextResponse } from 'next/server';
import { outlineOperations } from '@/app/lib/database';

export async function POST(request: Request) {
  try {
    const { outlineId, promptText, oldContent } = await request.json();
    // 将outlineId转换为数字类型
    const id = parseInt(outlineId.toString(), 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的大纲ID' }, { status: 400 });
    }

    // 验证参数
    if (!outlineId) {
      return NextResponse.json({ error: '请提供大纲ID' }, { status: 400 });
    }

    if (!promptText) {
      return NextResponse.json({ error: '请提供生成提示词' }, { status: 400 });
    }

    // 创建AI服务实例 (使用v2版本)
    const aiService = createAIServiceV2();

    // 从数据库获取所有大纲
    const settingsList = await outlineOperations.getAll();

    // 根据大纲ID获取当前大纲
    const outline = settingsList.find(out => out.id === id);
    if (!outline) {
      return NextResponse.json({ error: '未找到指定大纲' }, { status: 404 });
    }

    // 构建所有大纲内容
    const allOutlinesContent = settingsList.map((outline: any) => {
      return `- 名称：${outline.name}（类型：${outline.type}）\n内容：${outline.content || '无'}`;
    }).join('\n\n');

    // 准备AI消息
    const systemMessages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `你是一位专业的小说家助手，正在处理大纲：${outline.name}（类型：${outline.type}）。请根据用户的请求和大纲的类型，进一步丰富小说的设定和基础背景、大纲故事等内容。`
      },
      {
        role: 'system',
        content: `你需要为整个小说的创作设定大纲，注意你不需要编写详细的剧情或者正文，而是对于小说的设定、基础背景、大纲故事等内容进行完善。`
      },
      {
        role: 'system',
        content: `当前大纲的相关信息：\n- 名称：${outline.name}\n- 类型：${outline.type}\n`
      },
      {
        role: 'user',
        content: `当前大纲的旧内容, 用户可能是对这部分内容不满意，你需要结合旧内容和用户请求生成新的内容：${oldContent}`
      },
    ];

    const userMessages: OpenAIMessage[] = [
      {
        role: 'user',
        content: `小说所有设定：\n${allOutlinesContent}`
      },
      {
        role: 'user',
        content: promptText
      }
    ];

    // 准备AI消息（包含类型信息）
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: "当前用户在页面进行编辑，你只需要返回文本内容，不需要调用工具进行保存。"
      },
      ...systemMessages,
      ...userMessages
    ];

    // 使用流式响应
    return aiService.createSSEResponse(request, messages);
  } catch (error) {
    console.error('生成大纲内容失败:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '生成大纲内容失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}