'use client';
import { Modal, Button, Form, Select, TextArea } from '@douyinfe/semi-ui';
import { Outline } from '@/app/lib/database';
import { useState, useRef } from 'react';

interface AutoGenerateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  outlines: Outline[];
  onLoadingChange?: (loading: boolean) => void;
}

const AutoGenerateModal: React.FC<AutoGenerateModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  outlines,
  onLoadingChange
}) => {
  const [generating, setGenerating] = useState<boolean>(false);
  const formApiRef = useRef<any>(null);

  const outlineOptions = outlines
    .filter(outline => outline.type === '大纲')
    .map(outline => ({
      value: outline.id,
      label: outline.name,
      content: outline.content
    }));

  const handleGenerate = async (values: any) => {
    try {
      if (!values.autoGenerateCount || values.autoGenerateCount < 1) {
        alert('请输入有效的章节数量');
        return;
      }
      
      setGenerating(true);
      onLoadingChange?.(true);
      
      const response = await fetch('/api/ai/generate-chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoGenerateCount: values.autoGenerateCount,
          outlineId: values.selectedOutlineId,
          prompt: values.prompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成章节列表失败');
      }
      
      const { content: aiResponse } = await response.json();
      console.log('[AutoGenerate] 完整AI响应:', aiResponse);
      
      onSuccess();
      onCancel();
      alert(`成功生成章节`);
    } catch (error) {
      console.error('自动生成章节失败:', error);
      alert(error instanceof Error ? error.message : '自动生成章节失败，请检查控制台获取更多信息');
    } finally {
      setGenerating(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <Modal
      title="自动生成章节列表"
      visible={visible}
      onCancel={onCancel}
      onOk={async () => {
        if (formApiRef.current) {
          const values = formApiRef.current.getValues();
          await handleGenerate(values);
        }
      }}
      okText={generating ? '生成中...' : '生成章节'}
      okButtonProps={{ disabled: generating }}
      cancelText="取消"
    >
      <Form
        layout="vertical"
        initValues={{ autoGenerateCount: 1 }}
        getFormApi={(formApi) => {
          formApiRef.current = formApi;
        }}
      >
        <Form.Select
          field="selectedOutlineId"
          label="关联大纲"
          placeholder="请选择关联的大纲"
          optionList={outlineOptions}
        />
        <Form.InputNumber
          field="autoGenerateCount"
          label="预期章节数量"
          placeholder="请输入章节数量"
          min={1}
          max={50}
        />
        <Form.TextArea
          field="prompt"
          label="范围描述"
          placeholder="请输入章节生成的范围描述和要求"
          maxCount={500}
          rows={4}
        />
      </Form>
    </Modal>
  );
};

export default AutoGenerateModal;
