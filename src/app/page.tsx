import TestComponent from '@/components/TestComponent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <TestComponent />
    </div>
  );
}