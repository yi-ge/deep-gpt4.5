import { Modal, Input, message } from 'antd'
import { ChangeEvent, useState, useEffect } from 'react'

interface RenameModalProps {
  visible: boolean
  currentName: string
  onOk: (newName: string) => void
  onCancel: () => void
}

const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  currentName,
  onOk,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState(currentName)
  
  // 当外部currentName变化时更新内部状态
  useEffect(() => {
    setInputValue(currentName)
  }, [currentName])
  
  // 处理输入变化
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleOk = () => {
    if (inputValue.trim()) {
      onOk(inputValue.trim())
      message.success('会话已重命名')
    } else {
      message.error('会话名称不能为空')
    }
  }

  return (
    <Modal
      title='重命名会话'
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText='确定'
      cancelText='取消'
    >
      <Input
        placeholder='请输入会话名称'
        value={inputValue}
        onChange={handleChange}
        onPressEnter={handleOk}
        autoFocus
      />
    </Modal>
  )
}

export default RenameModal 