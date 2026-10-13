import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="page-enter flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="page-enter flex-1 w-full flex items-center justify-center py-12 px-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="page-enter w-full py-8 px-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
