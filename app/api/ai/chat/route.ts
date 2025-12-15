import { createAIServiceV2 } from '@/app/lib/ai-service-v2';
import { OpenAIMessage } from '@/app/lib/ai-service-v2';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages, stream = false } = await request.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: '无效的消息格式' }, { status: 400 });
    }

    const aiService = createAIServiceV2();

    if (stream) {
      // 使用SSE流式响应
      return aiService.createSSEResponse(request, messages as OpenAIMessage[]);
    } else {
      // 一次性读取响应
      const response = await aiService.sendMessage(messages as OpenAIMessage[]);
      return NextResponse.json({ content: response });
    }
  } catch (error) {
    console.error('AI聊天API错误:', error);
    return NextResponse.json({ error: 'AI请求失败' }, { status: 500 });
  }
}
