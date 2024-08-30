import React, { useContext, useState, useEffect } from 'react';
import { Web3Context } from './Web3Provider';
import { Navbar, Nav, Button, Container, NavDropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../config';
import { useOCAuth } from '@opencampus/ocid-connect-js';

function Header() {
    const { account, setAccount, setContract } = useContext(Web3Context);
    const [connected, setConnected] = useState(false);
    const { ocAuth } = useOCAuth();

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const web3 = new Web3(window.ethereum);
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];

                setAccount(account);

                const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
                setContract(contractInstance);

                setConnected(true);

                localStorage.setItem('connected', 'true');
                localStorage.setItem('account', account);

            } catch (error) {
                console.error("Failed to connect wallet:", error);
            }
        } else {
            alert("Please install MetaMask!");
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setContract(null);
        setConnected(false);

        localStorage.removeItem('ocid'); 
        localStorage.removeItem('connected');
        localStorage.removeItem('account');
        ocAuth.tokenManager.clear(); 
        ocAuth.transactionManager.clear(); 
        ocAuth.authInfoManager.clear();
    };

    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            disconnectWallet();
        } else if (accounts[0] !== account) {
            setAccount(accounts[0]);
            localStorage.setItem('account', accounts[0]);
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
        }

        if (localStorage.getItem('connected') === 'true' && !account) {
            connectWallet();
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, [account]);

    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="sticky-top">
            <Container>
                <Navbar.Brand as={Link} to="/">Libere</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Link to="/" className="nav-link">Create New Items</Link>
                        <Link to="/items" className="nav-link">My Items</Link>
                        <Link to="/openlibrary" className="nav-link">Open Library</Link> {/* Tambahkan link ke Open Library */}
                    </Nav>
                    <Nav className="ms-auto">
                        <NavDropdown title="Bookshelf" id="bookshelf-dropdown" className="text-white">
                            <NavDropdown.Item as={Link} to="/bookshelf">Bookshelf</NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/mylibraryitem">My Library Item</NavDropdown.Item>
                        </NavDropdown>
                        {connected && account ? (
                            <NavDropdown
                                title={`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                                id="basic-nav-dropdown"
                                align="end"
                                className="text-white"
                            >
                                <NavDropdown.Item onClick={disconnectWallet}>Logout</NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <Button 
                                variant="outline-light" 
                                onClick={connectWallet}
                            >
                                Login with MetaMask
                            </Button>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default Header;
