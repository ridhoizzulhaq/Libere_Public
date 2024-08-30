import React, { useEffect, useState } from 'react';
import { Card, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../config';
import { ReactReader } from 'react-reader';

function MyLibraryItem() {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedEpub, setSelectedEpub] = useState(null);
    const [location, setLocation] = useState(0);

    const fetchItem = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to continue.');
            setLoading(false);
            return;
        }
    
        try {
            setLoading(true);
            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);
    
            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];
    
            const accessInfo = await contract.methods.accessRegistry(account).call();
    
            // Convert accessEndTime to a regular number
            const accessEndTime = Number(accessInfo.accessEndTime);
    
            if (accessEndTime <= Math.floor(Date.now() / 1000)) {
                throw new Error("Access expired or not available.");
            }
    
            const item = await contract.methods.items(accessInfo.tokenId).call();
            const metadataUri = await contract.methods.uri(accessInfo.tokenId).call();
            const metadataResponse = await fetch(metadataUri);
            const metadata = await metadataResponse.json();
    
            setItem({
                ...item,
                accessEndTime: accessEndTime,
                metadata
            });
    
            setError('');
        } catch (error) {
            setError(`Error fetching item: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItem();
    }, []);

    const openEpubModal = (tokenId) => {
        const epubUrl = `http://localhost:5001/epubs/${tokenId}.epub`;
        setSelectedEpub(epubUrl);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEpub(null);
        setLocation(0);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div>
            <h2>My Library Item</h2>
            {item ? (
                <Card className="mb-4">
                    <Card.Img
                        variant="top"
                        src={item.metadata.image}
                        alt={item.metadata.name}
                        style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <Card.Body>
                        <Card.Title>{item.metadata.name}</Card.Title>
                        <Card.Text>
                            <strong>ID:</strong> {item.id}<br />
                            <strong>Description:</strong> {item.metadata.description}<br />
                            <strong>Access End Time:</strong> {new Date(item.accessEndTime * 1000).toLocaleString()}
                        </Card.Text>
                        <Button variant="primary" onClick={() => openEpubModal(item.id)}>
                            Open Content
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <Alert variant="info">No items found or access expired.</Alert>
            )}

            {/* Modal for Content Viewer */}
            <Modal size="xl" show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Content Viewer</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ height: '80vh' }}>
                    {selectedEpub ? (
                        <ReactReader
                            url={selectedEpub}
                            location={location}
                            locationChanged={(epubcfi) => setLocation(epubcfi)}
                        />
                    ) : (
                        <Alert variant="warning">Content not available for this item.</Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default MyLibraryItem;
