import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { useWeb3 } from '../components/Web3Provider';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { LoginButton, useOCAuth } from '@opencampus/ocid-connect-js';

function Home() {
    const { account, contract } = useWeb3();
    const { authState, ocAuth } = useOCAuth();

    const [formData, setFormData] = useState({
        price: '',
        royaltyValue: '',
        title: '',
        description: '',
        image: null,
        epub: null,
        ocid: '',
    });

    const [notification, setNotification] = useState("");
    const [notificationVariant, setNotificationVariant] = useState("info");
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (authState.isAuthenticated) {
            const info = ocAuth.getAuthInfo();
            setUserInfo(info);
            setFormData(prevFormData => ({
                ...prevFormData,
                ocid: info.edu_username || '',
            }));
        }
    }, [authState, ocAuth]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData({
            ...formData,
            [name]: files ? files[0] : value
        });
    };

    const uploadToIPFS = async () => {
        try {
            const imageData = new FormData();
            imageData.append('file', formData.image);

            const imageResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', imageData, {
                headers: {
                    'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
                    'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_API_KEY,
                    'Content-Type': 'multipart/form-data',
                },
            });

            const imageHash = imageResponse.data.IpfsHash;

            const metadata = {
                name: formData.title,
                description: formData.description,
                image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
                ocid_id: formData.ocid
            };

            const metadataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
                headers: {
                    'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
                    'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_API_KEY,
                    'Content-Type': 'application/json',
                },
            });

            return `https://gateway.pinata.cloud/ipfs/${metadataResponse.data.IpfsHash}`;
        } catch (error) {
            throw new Error("Failed to upload metadata to IPFS");
        }
    };

    const uploadEpubToServer = async (tokenId) => {
        try {
            const epubData = new FormData();
            epubData.append('epub', formData.epub);

            const epubResponse = await axios.post(`http://localhost:5001/upload-epub/${tokenId}`, epubData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return epubResponse.data.filePath;
        } catch (error) {
            throw new Error("Failed to upload EPUB to server: " + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setNotification("");

        const royaltyValue = parseInt(formData.royaltyValue);
        if (royaltyValue > 10) {
            setNotificationVariant("warning");
            setNotification("Royalty value cannot exceed 10%");
            setLoading(false);
            return;
        }

        try {
            if (!contract || !contract.methods) {
                throw new Error("Contract is not available or methods are undefined.");
            }

            const tokenId = Date.now();
            console.log("Generated tokenId:", tokenId);

            const metadataUri = await uploadToIPFS();

            // Upload EPUB to server
            if (formData.epub) {
                await uploadEpubToServer(tokenId);
            } else {
                setNotificationVariant("warning");
                setNotification("Please upload an EPUB file.");
                setLoading(false);
                return;
            }

            const web3 = new Web3(window.ethereum);
            const price = web3.utils.toWei(formData.price, 'ether');
            const recipient = account;
            const royaltyRecipient = account;
            const royaltyValueBasisPoints = royaltyValue * 100;

            const transactionReceipt = await contract.methods.createItem(
                tokenId,
                price,
                recipient,
                royaltyRecipient,
                royaltyValueBasisPoints,
                metadataUri
            ).send({ from: account });

            const transactionLog = {
                token_id: tokenId,
                price: formData.price,
                recipient: account,
                royaltyRecipient: account,
                royaltyValue: royaltyValueBasisPoints,
                metadataUri: metadataUri,
                timestamp: new Date().toISOString(),
                transactionHash: transactionReceipt.transactionHash
            };

            try {
                await axios.post('http://localhost:5001/api/items', transactionLog);
                setNotificationVariant("success");
                setNotification(`Item successfully created and logged. Transaction Hash: ${transactionReceipt.transactionHash}`);
            } catch (error) {
                setNotificationVariant("warning");
                setNotification(`Transaction succeeded but failed to log to the database. Transaction Hash: ${transactionReceipt.transactionHash}`);
            }

        } catch (error) {
            setNotificationVariant("danger");
            setNotification(`Error creating item: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };
    

    return (
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '100%', maxWidth: '600px' }} className="p-4 shadow">
                <Card.Body>
                    <Card.Title className="text-center mb-4">Create New Item</Card.Title>
                    {notification && (
                        <Alert variant={notificationVariant} className="text-center">
                            {notification}
                        </Alert>
                    )}
                    {!account ? (
                        <Alert variant="danger" className="text-center">
                            Please connect to MetaMask to access this page.
                        </Alert>
                    ) : (
                        <Form onSubmit={handleSubmit}>
                            <Form.Group controlId="formOcid">
                                <Form.Label>OCID</Form.Label>
                                <div className="d-flex">
                                    <Form.Control
                                        type="text"
                                        name="ocid"
                                        placeholder="Enter OCID"
                                        value={formData.ocid || ''}
                                        onChange={handleChange}
                                        disabled
                                    />
                                    {!authState.isAuthenticated && (
                                        <LoginButton />
                                    )}
                                </div>
                            </Form.Group>
                            <Form.Group controlId="formTitle" className="mt-3">
                                <Form.Label>Title</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="title"
                                    placeholder="Enter title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="formDescription" className="mt-3">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="description"
                                    placeholder="Enter description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="formImage" className="mt-3">
                                <Form.Label>Image</Form.Label>
                                <Form.Control
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="formEpub" className="mt-3">
                                <Form.Label>EPUB File</Form.Label>
                                <Form.Control
                                    type="file"
                                    name="epub"
                                    accept=".epub"
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group controlId="formPrice" className="mt-3">
                                <Form.Label>Price (in $EDU)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="price"
                                    placeholder="Enter price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                            <Form.Group controlId="formRoyalty" className="mt-3">
                                <Form.Label>Royalty Value (in %)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="royaltyValue"
                                    placeholder="Enter royalty value"
                                    value={formData.royaltyValue}
                                    onChange={handleChange}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Royalty cannot exceed 10%.
                                </Form.Text>
                            </Form.Group>
                            <Button type="submit" variant="primary" className="w-100 mt-4" disabled={loading}>
                                {loading ? (
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                ) : (
                                    "Create Item"
                                )}
                            </Button>
                        </Form>
                    )}
                    {userInfo && (
                        <Alert variant="info" className="mt-4">
                            <strong>Username:</strong> {userInfo.edu_username}<br />
                            <strong>Connected Address:</strong> {userInfo.eth_address}
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}

export default Home;