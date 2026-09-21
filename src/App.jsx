import React from 'react';
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import Header from './components/Header/Header.jsx'
import SignIn from './components/SignIn/SignIn.jsx'
import SignUp from './components/SignUp/SignUp.jsx'
import Home from './components/Home/Home.jsx'
import Calendar from './components/Calendar/Calendar.jsx'
import Messages from './components/Messages/Messages.jsx'
import Videocall from './components/Videocall/Videocall.jsx'
import DoctorSignIn from './components/SignIn/DoctorSignIn.jsx'
import AdminSignIn from './components/SignIn/AdminSignIn.jsx'
import Analytics from './components/Analytics/Analytics.jsx'
import LinkDevice from './components/LinkDevice/LinkDevice.jsx';
import Profile from './components/Profile/Profile.jsx';
import CreateDoctor from './pages/admin/CreateDoctor';
import AssignPatient from './pages/admin/AssignPatient';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';

const DefaultLayout = ({ children }) => (
  <>
    <div className="main-layout">
        <Header />
      <div className="page-content">
        {children}
      </div>
    </div>
  </>
);

const AuthLayout = ({ children }) => (
  <>
    {children}
  </>
);

function App () {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DefaultLayout><Home /></DefaultLayout>} />
          <Route path="/signup" element={<AuthLayout><SignUp /></AuthLayout>} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/doctor-signin" element={<DoctorSignIn />} />
          <Route path="/admin-signin" element={<AdminSignIn />} />

          <Route path="/home" element={<DefaultLayout><Home /></DefaultLayout>} />
          <Route path="/calendar" element={<DefaultLayout><Calendar /></DefaultLayout>} />
          <Route path="/messages" element={<DefaultLayout><Messages /></DefaultLayout>} />
          <Route path="/videocall" element={<AuthLayout><Videocall /></AuthLayout>} />
          <Route path="/analytics" element={<DefaultLayout><Analytics /></DefaultLayout>} />
          <Route path="/link-device" element={<DefaultLayout><LinkDevice /></DefaultLayout>} />
          <Route path="/profile" element={<DefaultLayout><Profile /></DefaultLayout>} />
          <Route path="/home/create-doctor" element={<CreateDoctor />} />
          <Route path="/home/assign-patient" element={<AssignPatient />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
