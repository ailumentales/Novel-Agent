'use client';
import { Modal, Button, Form, Select } from '@douyinfe/semi-ui';

import { Outline } from '../../lib/database';
import { useRef } from 'react';

interface OutlineModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  outline?: Outline | null;
}

const OutlineModal: React.FC<OutlineModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  outline
}) => {
  const isEditMode = !!outline;
  const formApiRef = useRef<any>(null);

  const handleSubmit = async (values: Outline) => {
    try {
      if (isEditMode && outline?.id) {
        console.log('编辑设定提交的数据:', values);
        console.log('当前大纲ID:', outline.id);
        
        const response = await fetch(`/api/outlines/${outline.id}`, {
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
      } else {
        const response = await fetch('/api/outlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '新增设定失败');
        }
      }
      
      onSuccess();
      onCancel();
    } catch (error) {
      console.error(isEditMode ? '编辑设定失败:' : '新增设定失败:', error);
      alert(error instanceof Error ? error.message : `${isEditMode ? '编辑设定' : '新增设定'}失败，请检查控制台获取更多信息`);
    }
  };

  return (
    <Modal
      title={isEditMode ? "编辑设定" : "新增设定"}
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
        {...(outline && { initValues: outline })}
        getFormApi={(formApi) => {
          formApiRef.current = formApi;
        }}
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
      </Form>
    </Modal>
  );
};

export default OutlineModal;
