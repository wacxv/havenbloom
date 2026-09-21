import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiHomeAlt } from "react-icons/bi";
import { BiCalendarAlt } from "react-icons/bi";
import { TbDeviceAnalytics } from "react-icons/tb";
import { BiLink } from "react-icons/bi";
import { BiMessage } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import { BiLogOut } from "react-icons/bi";
import { FaUserMd } from "react-icons/fa";
import { FaUserPlus } from "react-icons/fa";

import './Header.css';

const Header = () => {
    const [expanded, setExpanded] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isDoctor, setIsDoctor] = useState(false);
    const navigate = useNavigate();
    
    // Check user role
    useEffect(() => {
        setIsAdmin(false);
        setIsDoctor(false);
    }, []);
    
    const handleLogout = () => {
        // Clear user data and token from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Redirect based on role
        navigate('/home');
    };
    
    const handleNavigation = (path) => {
        navigate(path);
    };
    
    return (
        <>
            <div 
                id='header-outer' 
                className={expanded ? 'expanded' : 'collapsed'}
                onMouseEnter={() => setExpanded(true)}
                onMouseLeave={() => setExpanded(false)}
            >
                <div id='header-inner'>
                    <div id='header-container'>
                        <div className='menu-item hover-effect logo-container'>
                            <div className='logo-full'>
                                <span className='logo-h'>H</span>
                                <span className='logo-rest'>avenbloom</span>
                            </div>
                        </div>
                        <div id='top-section'>
                            {isAdmin ? (
                                // Admin menu items
                                <>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/home')}>
                                        <div className='icon-container'>
                                            <BiHomeAlt className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Home
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/home/create-doctor')}>
                                        <div className='icon-container'>
                                            <FaUserMd className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Create Doctor
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/home/assign-patient')}>
                                        <div className='icon-container'>
                                            <FaUserPlus className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Assign Patient
                                        </div>
                                    </div>
                                </>
                            ) : isDoctor ? (
                                // Doctor menu items (without Analytics and Link Device)
                                <>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/home')}>
                                        <div className='icon-container'>
                                            <BiHomeAlt className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Home
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/calendar')}>
                                        <div className='icon-container'>
                                            <BiCalendarAlt className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Calendar
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/messages')}>
                                        <div className='icon-container'>
                                            <BiMessage className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Messages
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // Patient menu items (with all options)
                                <>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/home')}>
                                        <div className='icon-container'>
                                            <BiHomeAlt className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Home
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/calendar')}>
                                        <div className='icon-container'>
                                            <BiCalendarAlt className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Calendar
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/analytics')}>
                                        <div className='icon-container'>
                                            <TbDeviceAnalytics className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Analytics
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/link-device')}>
                                        <div className='icon-container'>
                                            <BiLink className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Link Device
                                        </div>
                                    </div>
                                    <div className='menu-item hover-effect' onClick={() => handleNavigation('/messages')}>
                                        <div className='icon-container'>
                                            <BiMessage className='nav-icon'/>
                                        </div>
                                        <div className='menu-text'>
                                            Messages
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div id='bottom-section'>
                            {!isAdmin && (
                                <div className='menu-item hover-effect' onClick={() => handleNavigation('/profile')}>
                                    <div className='icon-container'>
                                        <CgProfile className='nav-icon'/>
                                    </div>
                                    <div className='menu-text'>
                                        Profile
                                    </div>
                                </div>
                            )}
                            
                            <div className='menu-item hover-effect' onClick={handleLogout}>
                                <div className='icon-container'>
                                    <BiLogOut className='nav-icon'/>
                                </div>
                                <div className='menu-text'>
                                    Sign out
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Header;