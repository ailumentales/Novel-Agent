'use client';
import { Modal, Button, Form } from '@douyinfe/semi-ui';
        
import { Chapter } from '../../lib/database';
import { useRef } from 'react';

interface FormChapter extends Chapter {
  wordCount?: string;
}

interface ChapterModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  chapter?: Chapter | null;
}

const ChapterModal: React.FC<ChapterModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  chapter
}) => {
  const isEditMode = !!chapter;
  const formApiRef = useRef<any>(null);

  const handleSubmit = async (values: FormChapter) => {
    try {
      if (isEditMode && chapter?.id) {
        const response = await fetch(`/api/chapters/${chapter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '编辑章节失败');
        }
      } else {
        const response = await fetch('/api/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '新增章节失败');
        }
      }
      
      onSuccess();
      onCancel();
    } catch (error) {
      console.error(isEditMode ? '编辑章节失败:' : '新增章节失败:', error);
      alert(error instanceof Error ? error.message : `${isEditMode ? '编辑章节' : '新增章节'}失败，请检查控制台获取更多信息`);
    }
  };

  return (
    <Modal
      title={isEditMode ? "编辑章节" : "新增章节"}
      visible={visible}
      onCancel={onCancel}
      onOk={async () => {
        if (formApiRef.current) {
          const values = formApiRef.current.getValues();
          await handleSubmit(values);
        }
      }}
      okText="提交"
      cancelText="取消"
      width={500}
    >
      <Form
        layout="vertical"
        {...(chapter && { initValues: chapter })}
        getFormApi={(formApi) => {
          formApiRef.current = formApi;
        }}
      >
        <Form.Input 
          field="title" 
          label="标题" 
          placeholder="请输入章节标题" 
          rules={[{ required: true, message: '请输入章节标题' }]} 
        />
        {isEditMode && (
          <Form.Input 
            field="number" 
            label="章节编号" 
            placeholder="请输入章节编号" 
            rules={[{ required: true, message: '请输入章节编号' }]} 
          />
        )}
      </Form>
    </Modal>
  );
};

export default ChapterModal;
