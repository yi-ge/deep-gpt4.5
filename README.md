# DeepGPT4.5

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

## 📝 项目简介

DeepGPT4.5是一个创新的人工智能应用，将DeepSeek R1模型的思维链能力与GPT-4.5的强大推理能力相结合。通过这种结合，我们能够获得更深入、更全面的AI推理结果，同时为用户提供思维过程的透明度。

### 🌟 核心特性

- **双模型协同**：结合DeepSeek R1的思维链和GPT-4.5的推理能力
- **思维链可视化**：查看AI的推理过程，了解其决策依据
- **模型对比**：直观对比两种顶尖AI模型的回答差异
- **灵活视图切换**：支持单一模型视图和分栏对比视图

## 🔄 工作流程

系统采用以下流程处理用户查询：

1. 用户提交问题后，系统首先将请求发送至DeepSeek R1模型
2. DeepSeek R1生成回答和详细的思维链过程
3. 系统将原始问题和DeepSeek的思维链作为上下文，一并发送给GPT-4.5
4. GPT-4.5基于这些信息生成自己的回答
5. 系统默认展示GPT-4.5的回答，同时提供查看选项：
   - 切换至DeepSeek R1的回答
   - 使用分栏视图同时查看两个模型的回答
   - 展开查看DeepSeek R1的思维链详情

## 🚀 快速开始

### 环境要求

- Node.js 16.x或更高版本
- npm 7.x或更高版本

### 安装步骤

1. 克隆项目仓库

```bash
git clone https://github.com/yi-ge/deep-gpt4.5.git
cd deep-gpt4.5
```

2. 安装依赖

```bash
pnpm install
```

3. 启动开发服务器

```bash
vercel dev
```

## 🧪 本地测试

项目包含一个模拟服务器，可以模拟DeepSeek R1和GPT-4.5的响应，便于本地开发和测试。

### 使用模拟服务器

1. 确保模拟服务器已启动 (`vercel dev`)
2. 确保前端应用配置指向模拟服务器地址
3. 在应用的聊天界面中发送测试消息
4. 测试不同的模型切换和思维链显示功能

## 💻 部署指南

### 使用Vercel部署

快速部署到Vercel平台：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yi-ge/deep-gpt4.5)

或通过命令行部署：

```bash
vercel
```

## 🔧 高级配置

### 📚 在Vercel上配置环境变量

要完整支持本项目功能，API服务器需要配置：

1. DeepSeek R1 API接入
2. GPT-4.5 API接入

在Vercel平台上配置项目所需的环境变量：

1. 登录Vercel账户并进入项目设置
2. 导航至"Settings" > "Environment Variables"
3. 添加以下环境变量：

| 名称 | 描述 | 示例值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | sk-... |
| `DEEPSEEK_BASE_URL` | DeepSeek API基础URL | <https://xxx/v1> |
| `OPENAI_API_KEY` | OpenAI API密钥 | sk-... |
| `OPENAI_BASE_URL` | OpenAI API基础URL | <https://xxx/v1> |

4. 点击"Save"保存设置
5. 重新部署项目以应用新的环境变量

## 📄 许可证

本项目采用MIT许可证 - 详见[LICENSE](LICENSE)文件
