import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => (
  <div className="layout">
    <Sidebar />
    <div className="main-content">
      <Outlet />
    </div>
  </div>
);

export default Layout;
