'use client';

import { App as AntApp, ConfigProvider, Layout, Typography, theme } from 'antd';

const { Header, Sider, Content } = Layout;

function AppHeader() {
  const { token } = theme.useToken();
  return (
    <Header>
      <Typography.Text style={{ color: token.colorTextLightSolid }} strong>
        antd-builder
      </Typography.Text>
    </Header>
  );
}

export function Editor() {
  return (
    <ConfigProvider>
      <AntApp>
        <Layout style={{ height: '100vh' }}>
          <AppHeader />
          <Layout>
            <Sider width={260} theme="light">
              {/* Component palette: antd components + AI-generated custom components */}
            </Sider>
            <Content>{/* Canvas: renders the page tree with real antd components */}</Content>
            <Sider width={320} theme="light">
              {/* Inspector: props, theme tokens, AI prompt */}
            </Sider>
          </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
