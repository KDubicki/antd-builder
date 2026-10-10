import { Button, Result } from 'antd';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="The page you are looking for does not exist."
      extra={
        <Link href="/">
          <Button type="primary">Back to editor</Button>
        </Link>
      }
    />
  );
}
