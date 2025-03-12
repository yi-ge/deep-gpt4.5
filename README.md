# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

While this project uses React, Vite supports many popular JS frameworks. [See all the supported frameworks](https://vitejs.dev/guide/#scaffolding-your-first-vite-project).

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/vite-react&template=vite-react)

_Live Example: <https://vite-react-example.vercel.app>_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
vercel
```

# DeepGPT4.5

将DeepSeek R1满血版的思维链用于 GPT4.5 的推理。

## 新功能实现

最近添加了两模型对比功能，实现了以下流程：

1. 用户发送一个问题时，系统首先向 DeepSeek R1 发送请求
2. 获取 DeepSeek R1 的回复和思维链过程
3. 将思维链附加到用户问题中，然后发送给 GPT-4.5
4. 默认显示 GPT-4.5 的回复
5. 提供界面按钮让用户能够：
   - 切换查看 DeepSeek R1 或 GPT-4.5 的回复
   - 使用分栏视图对比两个模型的回复
   - 查看 DeepSeek R1 的思维链过程

## 模拟服务器使用说明

项目包含一个模拟服务器，可以模拟 DeepSeek R1 和 GPT-4.5 的响应，便于本地测试。

### 安装依赖

```bash
npm install
```

### 启动测试服务器

```bash
vercel dev
```

### 测试功能

1. 启动前端应用
2. 确保前端请求指向模拟服务器地址
3. 在聊天界面中发送消息
4. 观察系统如何处理两个模型的响应
5. 测试不同的模型切换和思维链显示功能

## 后端配置

要支持这个功能，API 服务器需要配置处理 DeepSeek R1 和 GPT-4.5 的路由，以及支持思维链返回。

## 使用方法

1. 启动前端和 API 服务器
2. 在对话框中输入问题
3. 系统会自动向两个模型发送请求
4. 默认显示 GPT-4.5 的回复
5. 使用消息底部的按钮切换模型视图或查看思维链
