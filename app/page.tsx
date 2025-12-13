'use client';
import { Layout, TextArea, List, Button, Card, Tabs, Modal, Form, Select } from '@douyinfe/semi-ui';
import { IconPlusCircle, IconEdit, IconDelete } from '@douyinfe/semi-icons';
import { useEffect, useState } from 'react';
import { useAIClient } from './lib/ai-client';
import { OpenAIMessage } from './lib/ai-service';

const { Header, Sider, Content } = Layout;

export default function Home() {
  // 状态管理
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [settingsList, setSettingsList] = useState<any[]>([]);
  const [showOutlineModal, setShowOutlineModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showEditOutlineModal, setShowEditOutlineModal] = useState(false);
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [currentOutline, setCurrentOutline] = useState<any>(null);
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  // 选中项目状态
  const [selectedOutline, setSelectedOutline] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  // 输入输出内容状态
  const [promptText, setPromptText] = useState('');
  const [contentText, setContentText] = useState('');
  const [thinkText, setThinkText] = useState('');
  
  // AI客户端
  const aiClient = useAIClient();
  const [generating, setGenerating] = useState(false);
  
  // 从数据库获取数据
  useEffect(() => {
    fetchOutlines();
    fetchChapters();
  }, []);
  
  // 获取大纲列表
  const fetchOutlines = async () => {
    try {
      const response = await fetch('/api/outlines');
      if (!response.ok) {
        throw new Error('获取大纲失败');
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('大纲数据格式不正确');
      }
      setSettingsList(data);
    } catch (error) {
      console.error('获取大纲失败:', error);
      alert(error instanceof Error ? error.message : '获取大纲失败，请检查控制台获取更多信息');
    }
  };
  
  // 获取章节列表
  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (!response.ok) {
        throw new Error('获取章节失败');
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('章节数据格式不正确');
      }
      // 格式化字数显示
      const formattedChapters = data.map((chapter: any) => ({
        ...chapter,
        wordCount: chapter.word_count ? chapter.word_count.toLocaleString() : '0'
      }));
      setChaptersList(formattedChapters);
    } catch (error) {
      console.error('获取章节失败:', error);
      alert(error instanceof Error ? error.message : '获取章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 新增设定
  const handleAddOutline = async (values: any) => {
    try {
      const response = await fetch('/api/outlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增设定失败');
      }
      
      setShowOutlineModal(false);
      fetchOutlines();
    } catch (error) {
      console.error('新增设定失败:', error);
      alert(error instanceof Error ? error.message : '新增设定失败，请检查控制台获取更多信息');
    }
  };
  
  // 新增章节
  const handleAddChapter = async (values: any) => {
    try {
      const response = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '新增章节失败');
      }
      
      setShowChapterModal(false);
      fetchChapters();
    } catch (error) {
      console.error('新增章节失败:', error);
      alert(error instanceof Error ? error.message : '新增章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 编辑设定
  const handleEditOutline = async (values: any) => {
    try {
      console.log('编辑设定提交的数据:', values);
      console.log('当前大纲ID:', currentOutline.id);
      
      const response = await fetch(`/api/outlines/${currentOutline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      console.log('编辑设定的响应状态:', response.status);
      const responseData = await response.json();
      console.log('编辑设定的响应数据:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.error || '编辑设定失败');
      }
      
      setShowEditOutlineModal(false);
      fetchOutlines();
    } catch (error) {
      console.error('编辑设定失败:', error);
      alert(error instanceof Error ? error.message : '编辑设定失败，请检查控制台获取更多信息');
    }
  };
  
  // 编辑章节
  const handleEditChapter = async (values: any) => {
    try {
      const response = await fetch(`/api/chapters/${currentChapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '编辑章节失败');
      }
      
      setShowEditChapterModal(false);
      fetchChapters();
    } catch (error) {
      console.error('编辑章节失败:', error);
      alert(error instanceof Error ? error.message : '编辑章节失败，请检查控制台获取更多信息');
    }
  };
  
  // 预留预处理Hook接口
  // 这里可以根据不同类型实现不同的预处理逻辑
  const useOutlinePreprocessor = (outline: any) => {
    return {
      // 可以返回预处理后的system prompt或messages
      getSystemPrompt: () => `你是一位专业的小说家助手，正在处理大纲：${outline.name}（类型：${outline.type}）。请根据用户的请求生成符合该大纲设定的高质量内容。`,
      // 可以添加更多预处理方法
      processUserInput: (input: string) => input
    };
  };

  const useChapterPreprocessor = (chapter: any) => {
    return {
      getSystemPrompt: () => `你是一位专业的小说家助手，正在处理小说章节：第${chapter.number}章 ${chapter.title}。请根据用户的请求生成符合该章节风格和内容的高质量小说文本。`,
      processUserInput: (input: string) => input
    };
  };

  // 生成AI内容
  const handleGenerate = async () => {
    try {
      if (!promptText.trim()) {
        alert('请先输入AI请求内容');
        return;
      }
      
      if (!selectedOutline && !selectedChapter) {
        alert('请先选择一个大纲或章节');
        return;
      }
      
      setGenerating(true);
      
      // 根据选中类型获取预处理Hook
      let systemPrompt = '你是一位专业的小说家助手，根据用户的请求生成高质量的小说内容。';
      let processedPrompt = promptText;
      
      if (selectedOutline) {
        // 使用大纲预处理Hook
        const outlineProcessor = useOutlinePreprocessor(selectedOutline);
        systemPrompt = outlineProcessor.getSystemPrompt();
        processedPrompt = outlineProcessor.processUserInput(promptText);
      } else if (selectedChapter) {
        // 使用章节预处理Hook
        const chapterProcessor = useChapterPreprocessor(selectedChapter);
        systemPrompt = chapterProcessor.getSystemPrompt();
        processedPrompt = chapterProcessor.processUserInput(promptText);
      }
      
      // 准备AI消息（包含类型信息）
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: processedPrompt
        }
      ];
      
      // 使用流式响应
      await aiClient.sendMessageStream(messages, (chunk, isComplete) => {
        if (!isComplete) {
          // 分离think内容和普通内容
          let processedContent = chunk;
          let processedThink = '';
          
          // 提取think内容（假设think内容用<think></think>标签包裹）
          const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
          const matches = [...chunk.matchAll(thinkRegex)];
          
          if (matches.length > 0) {
            // 提取最后一个匹配的think内容
            processedThink = matches[matches.length - 1][1];
            
            // 从原始内容中移除所有think标签
            processedContent = chunk.replace(thinkRegex, '');
            
            // 确保think内容最多显示4行
            const thinkLines = processedThink.split('\n');
            if (thinkLines.length > 4) {
              processedThink = thinkLines.slice(0, 4).join('\n') + '...';
            }
          }
          
          // 更新状态
          setContentText(processedContent);
          setThinkText(processedThink);
        } else {
          setGenerating(false);
        }
      });
      
    } catch (error) {
      console.error('AI生成失败:', error);
      alert('AI生成失败，请检查控制台获取更多信息');
      setGenerating(false);
    }
  };

  // 保存内容
  const handleSaveContent = async () => {
    try {
      if (!selectedOutline && !selectedChapter) {
        alert('请先选择一个大纲或章节');
        return;
      }
      
      const data = {
        prompt: promptText,
        content: contentText
      };
      
      let response;
      if (selectedOutline) {
        // 保存大纲
        response = await fetch(`/api/outlines/${selectedOutline.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        // 保存章节
        // 确保内容长度用于字数统计
        const chapterData = {
          ...data,
          word_count: contentText.length
        };
        response = await fetch(`/api/chapters/${selectedChapter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chapterData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存失败');
      }
      
      // 保存成功后重新获取最新数据
      fetchOutlines();
      fetchChapters();
      
      // 更新当前选中项状态
      if (selectedOutline) {
        const updatedOutline = { ...selectedOutline, ...data };
        setSelectedOutline(updatedOutline);
      } else {
        const updatedChapter = { 
          ...selectedChapter, 
          ...data, 
          word_count: contentText.length,
          wordCount: contentText.length.toLocaleString()
        };
        setSelectedChapter(updatedChapter);
      }
      
      alert('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      alert(error instanceof Error ? error.message : '保存失败，请检查控制台获取更多信息');
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Layout className="w-full h-full">
        {/* 左侧章节列表 */}
        <Sider 
          className="bg-white border-r border-gray-200" 
          style={{ width: 280 }}
        >
          <Header className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800">Novel-Agent</h2>
            </div>
          </Header>
          <Content className="p-4">
            <Tabs defaultActiveKey="chapters" className="mb-4">
              <Tabs.TabPane tab="大纲" itemKey="outline">
                <h3 className="text-sm font-medium text-gray-700 mb-3">设定列表</h3>
                <List
                  dataSource={settingsList}
                  renderItem={(setting) => (
                    <List.Item 
                      key={setting.id}
                      className="cursor-pointer hover:bg-gray-50 rounded-md p-3 transition-colors border-l-2 border-transparent hover:border-purple-500"
                      onClick={() => {
                        // 选中大纲
                        setSelectedOutline(setting);
                        setSelectedChapter(null);
                        // 加载数据到输入输出区域
                        setPromptText(setting.prompt || '');
                        setContentText(setting.content || '');
                        // 清空思考内容
                        setThinkText('');
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className={`text-gray-800 font-medium truncate ${selectedOutline?.id === setting.id ? 'text-purple-600' : ''}`}>{setting.name}</div>
                          <div className="text-xs text-gray-500">{setting.type}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                          <Button 
                            icon={<IconEdit />} 
                            type="tertiary" 
                            size="small"
                            onClick={() => {
                              console.log('点击编辑按钮，当前设定:', setting);
                              setCurrentOutline(setting);
                              setShowEditOutlineModal(true);
                              console.log('编辑模态框已显示，currentOutline:', currentOutline);
                            }}
                          />
                          <Button 
                            icon={<IconDelete />} 
                            type="tertiary" 
                            size="small"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/outlines/${setting.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  fetchOutlines();
                                }
                              } catch (error) {
                                console.error('删除设定失败:', error);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                <Button 
                  icon={<IconPlusCircle />} 
                  type="tertiary" 
                  size="small"
                  className="w-full mt-3 rounded-md"
                  onClick={() => setShowOutlineModal(true)}
                >
                  新增设定
                </Button>
              </Tabs.TabPane>
              <Tabs.TabPane tab="章节" itemKey="chapters">
                <List
                  dataSource={chaptersList}
                  renderItem={(chapter) => (
                    <List.Item 
                      key={chapter.id}
                      className="cursor-pointer hover:bg-gray-50 rounded-md p-3 transition-colors border-l-2 border-transparent hover:border-blue-500"
                      onClick={() => {
                        // 选中章节
                        setSelectedChapter(chapter);
                        setSelectedOutline(null);
                        // 加载数据到输入输出区域
                        setPromptText(chapter.prompt || '');
                        setContentText(chapter.content || '');
                        // 清空思考内容
                        setThinkText('');
                      }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className={`text-gray-800 font-medium truncate ${selectedChapter?.id === chapter.id ? 'text-blue-600' : ''}`}>第{chapter.number}章 {chapter.title}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">字数: {chapter.wordCount}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
                          <Button 
                            icon={<IconEdit />} 
                            type="tertiary" 
                            size="small"
                            onClick={() => {
                              setCurrentChapter(chapter);
                              setShowEditChapterModal(true);
                            }}
                          />
                          <Button 
                            icon={<IconDelete />} 
                            type="tertiary" 
                            size="small"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/chapters/${chapter.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  fetchChapters();
                                }
                              } catch (error) {
                                console.error('删除章节失败:', error);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
                <Button 
                  icon={<IconPlusCircle />} 
                  type="tertiary" 
                  size="small"
                  className="w-full mt-3 rounded-md"
                  onClick={() => setShowChapterModal(true)}
                >
                  新增章节
                </Button>
              </Tabs.TabPane>
            </Tabs>
          </Content>
        </Sider>
        
        {/* 右侧内容区域 */}
        <Layout className="flex-1 flex flex-col">
          {/* 输入请求和AI输出都放在同一个Content容器中 */}
          <Content className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* 当前选中项标题 */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedOutline ? `大纲：${selectedOutline.name}` : 
                 selectedChapter ? `章节：第${selectedChapter.number}章 ${selectedChapter.title}` : 
                 '请选择一个大纲或章节'}
              </h2>
              {selectedChapter && (
                <p className="text-sm text-gray-500 mt-1">
                  章节编号：{selectedChapter.number} | 字数：{selectedChapter.wordCount}
                </p>
              )}
            </div>
            
            {/* 顶部输入框 - 固定最小高度 */}
            <Card className="mb-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">输入请求</h3>
                <Button type="primary" size="large" onClick={handleGenerate} disabled={generating}>
                  {generating ? '生成中...' : '开始生成'}
                </Button>
              </div>
              <TextArea
                placeholder="请输入与AI的对话请求..."
                style={{ width: '100%', minHeight: '150px' }}
                value={promptText}
                onChange={(value) => setPromptText(value)}
              />
            </Card>
            
            {/* 底部输出区域 - 占满剩余高度 */}
            <Card className="flex-1 flex flex-col" bodyStyle={{ height: 'calc(100% - 50px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">AI输出</h3>
                <Button type="primary" size="small" onClick={handleSaveContent}>保存</Button>
              </div>
              <div className="flex-1 overflow-hidden" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Think内容显示区域 */}
                {thinkText && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md max-h-40 overflow-y-auto">
                    <div className="text-sm font-medium text-blue-800 mb-2">思考内容:</div>
                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{thinkText}</div>
                  </div>
                )}
                {/* 普通内容显示区域 */}
                <div className="flex-1 overflow-hidden">
                  <TextArea
                    placeholder="AI的输出内容将显示在这里..."
                    style={{ width: '100%', height: '100%'}}
                    value={contentText}
                    onChange={(value) => setContentText(value)}
                  />
                </div>
              </div>
            </Card>
          </Content>
        </Layout>
      </Layout>
      
      {/* 新增设定弹窗 */}
      <Modal
        title="新增设定"
        visible={showOutlineModal}
        onCancel={() => setShowOutlineModal(false)}
        width={500}
        footer={null}
      >
        <Form
          onSubmit={handleAddOutline}
          layout="vertical"
        >
          <Form.Input 
            field="name" 
            label="名称" 
            placeholder="请输入设定名称" 
            rules={[{ required: true, message: '请输入设定名称' }]} 
          />
          <Form.Select 
            field="type" 
            label="类型" 
            placeholder="请选择设定类型" 
            rules={[{ required: true, message: '请选择设定类型' }]}
          >
            <Select.Option value="人物">人物</Select.Option>
            <Select.Option value="背景">背景</Select.Option>
            <Select.Option value="设定">设定</Select.Option>
            <Select.Option value="大纲">大纲</Select.Option>
            <Select.Option value="其他">其他</Select.Option>
          </Form.Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="tertiary" onClick={() => setShowOutlineModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit">提交</Button>
          </div>
        </Form>
      </Modal>
      
      {/* 新增章节弹窗 */}
      <Modal
        title="新增章节"
        visible={showChapterModal}
        onCancel={() => setShowChapterModal(false)}
        width={500}
        footer={null}
      >
        <Form
          onSubmit={handleAddChapter}
          layout="vertical"
        >
          <Form.Input 
            field="title" 
            label="标题" 
            placeholder="请输入章节标题" 
            rules={[{ required: true, message: '请输入章节标题' }]} 
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="tertiary" onClick={() => setShowChapterModal(false)}>取消</Button>
            <Button type="primary" htmlType="submit">提交</Button>
          </div>
        </Form>
      </Modal>
      
      {/* 编辑设定弹窗 */}
      <Modal
        title="编辑设定"
        visible={showEditOutlineModal}
        onCancel={() => setShowEditOutlineModal(false)}
        width={500}
        footer={null}
      >
        {currentOutline && (
          <>
            {console.log('编辑模态框渲染，currentOutline:', currentOutline)}
            <Form
              onSubmit={handleEditOutline}
              layout="vertical"
              initValues={currentOutline}
            >
              <Form.Input 
                field="name" 
                label="名称" 
                placeholder="请输入设定名称" 
                rules={[{ required: true, message: '请输入设定名称' }]} 
              />
              <Form.Select 
                field="type" 
                label="类型" 
                placeholder="请选择设定类型" 
                rules={[{ required: true, message: '请选择设定类型' }]}
              >
                <Select.Option value="人物">人物</Select.Option>
                <Select.Option value="背景">背景</Select.Option>
                <Select.Option value="设定">设定</Select.Option>
                <Select.Option value="大纲">大纲</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Form.Select>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="tertiary" onClick={() => setShowEditOutlineModal(false)}>取消</Button>
                <Button type="primary" htmlType="submit">提交</Button>
              </div>
            </Form>
          </>
        )}
      </Modal>
      
      {/* 编辑章节弹窗 */}
      <Modal
        title="编辑章节"
        visible={showEditChapterModal}
        onCancel={() => setShowEditChapterModal(false)}
        width={500}
        footer={null}
      >
        {currentChapter && (
          <Form
            onSubmit={handleEditChapter}
            layout="vertical"
            initValues={currentChapter}
          >
            <Form.Input 
              field="title" 
              label="标题" 
              placeholder="请输入章节标题" 
              rules={[{ required: true, message: '请输入章节标题' }]} 
            />
            <Form.Input 
              field="number" 
              label="章节编号" 
              placeholder="请输入章节编号" 
              rules={[{ required: true, message: '请输入章节编号' }, { type: 'number', message: '请输入有效的数字' }]} 
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="tertiary" onClick={() => setShowEditChapterModal(false)}>取消</Button>
              <Button type="primary" htmlType="submit">提交</Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}