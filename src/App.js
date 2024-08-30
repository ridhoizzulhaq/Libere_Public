import React, { useState, useEffect, useContext } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import Items from './pages/Items';
import PurchaseItem from './pages/PurchaseItem';
import PurchaseButtonPage from './pages/PurchaseButtonPage';
import Bookshelf from './pages/Bookshelf';
import MyLibraryItem from './pages/MyLibraryItem';  // Import MyLibraryItem component
import EpubReader from './pages/EpubReader';  // Import EpubReader component
import OpenLibrary from './pages/OpenLibrary'; // Import OpenLibrary component
import { Container } from 'react-bootstrap';
import { Web3Provider, Web3Context } from './components/Web3Provider';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { OCConnect, LoginCallBack, useOCAuth } from '@opencampus/ocid-connect-js';

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const { authState, ocAuth } = useOCAuth();
    const web3Context = useContext(Web3Context);

    const [prevAccount, setPrevAccount] = useState(web3Context.account);

    useEffect(() => {
        if (authState.isAuthenticated) {
            const userInfo = ocAuth.getAuthInfo();
            console.log('OCID Username:', userInfo.edu_username);
            console.log('Connected Address:', userInfo.eth_address);
        }
    }, [authState, ocAuth]);

    useEffect(() => {
        if (web3Context.account && web3Context.account !== prevAccount) {
            console.log("Account changed, updating state without logout");
            setPrevAccount(web3Context.account);
        }
    }, [web3Context.account, prevAccount]);

    const handleOcidLogout = () => {
        try {
            ocAuth.tokenManager.clear(); 
            ocAuth.transactionManager.clear(); 
            ocAuth.authInfoManager.clear();
            localStorage.removeItem('ocid'); 
            navigate('/');
        } catch (error) {
            console.error('Failed to reset OCID session:', error);
        }
    };

    const loginSuccess = () => {
        console.log('Login successful');
        navigate('/');
    };

    const loginError = (error) => {
        console.error('Login error:', error);
    };

    const isPublicRoute = location.pathname.startsWith('/purchase');

    return (
        <>
            {!isPublicRoute && <Header />}
            <Container fluid={isPublicRoute}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/items" element={<Items />} />
                    <Route path="/bookshelf" element={<Bookshelf />} />
                    <Route path="/mylibraryitem" element={<MyLibraryItem />} />  {/* Add route for MyLibraryItem */}
                    <Route path="/openlibrary" element={<OpenLibrary />} /> {/* Tambahkan route untuk OpenLibrary */}
                    <Route path="/epub-reader/:tokenId" element={<EpubReader />} /> {/* Add route for EpubReader */}
                    
                    {/* Public Routes */}
                    <Route path="/purchase/:id" element={<PurchaseItem />} />
                    <Route path="/purchase/:id/iframe" element={<PurchaseButtonPage />} />
                    
                    {/* OCID Login Callback Route */}
                    <Route 
                        path="/redirect" 
                        element={
                            <LoginCallBack
                                successCallback={loginSuccess}
                                errorCallback={loginError}
                            />
                        }
                    />
                </Routes>
            </Container>
        </>
    );
}

function App() {
    const opts = {
        redirectUri: 'http://localhost:3000/redirect', 
    };

    return (
        <OCConnect opts={opts} sandboxMode={true}>
            <Web3Provider>
                <Router>
                    <AppContent />
                </Router>
            </Web3Provider>
        </OCConnect>
    );
}

export default App;
