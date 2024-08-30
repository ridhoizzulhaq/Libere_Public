import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { useWeb3 } from '../components/Web3Provider';
import { Card, Alert, Spinner, Button, Modal } from 'react-bootstrap';
import { ReactReader } from 'react-reader';
import { contractABI, contractAddress } from '../config'; // Ensure this import statement is correct

function Bookshelf() {
    const { account } = useWeb3();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEpub, setSelectedEpub] = useState(null);
    const [location, setLocation] = useState(0);
    const [showModal, setShowModal] = useState(false);

    const resolveIPFS = (uri) => {
        if (uri.startsWith('ipfs://')) {
            return `https://gateway.pinata.cloud/ipfs/${uri.substring(7)}`;
        }
        return uri;
    };

    const fetchItems = async (retryCount = 3) => {
        if (!account) {
            setError('Please connect your wallet.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axios.get(`https://opencampus-codex.blockscout.com/api/v2/addresses/${account}/nft?type=ERC-1155`);

            if (response.status !== 200 || !response.data.items) {
                throw new Error('Unexpected API response');
            }

            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const itemsWithMetadata = await Promise.all(response.data.items.map(async (item) => {
                try {
                    const uri = await contract.methods.uri(item.id).call();
                    const resolvedUri = resolveIPFS(uri);
                    const metadataResponse = await fetch(resolvedUri);
                    const metadata = await metadataResponse.json();

                    return {
                        ...item,
                        metadata,
                    };
                } catch (err) {
                    console.error(`Failed to fetch metadata for item: ${item.id}`, err);
                    return null; // Skip items that failed to fetch metadata
                }
            }));

            const validItems = itemsWithMetadata.filter(item => item !== null);
            setItems(validItems);
            setError('');
        } catch (error) {
            console.error("Failed to fetch items:", error);

            if (retryCount > 0) {
                console.log(`Retrying... (${3 - retryCount + 1})`);
                fetchItems(retryCount - 1);
            } else {
                setError(`Failed to fetch items: ${error.message}. Please try again.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const openEpubModal = (tokenId) => {
        setSelectedEpub(`http://localhost:5001/epubs/${tokenId}.epub`);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEpub(null);
        setLocation(0);
    };

    useEffect(() => {
        fetchItems();
    }, [account]);

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
            <h2>Bookshelf</h2>
            {items.length > 0 ? (
                <div className="row">
                    {items.map(item => (
                        <div key={item.id} className="col-md-4 d-flex">
                            <Card className="mb-4 flex-fill" style={{ height: '100%' }}>
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
                                        <strong>Value:</strong> {item.value} <br />
                                        <strong>OCID ID:</strong> {item.metadata.ocid_id}
                                    </Card.Text>
                                    <Button variant="primary" onClick={() => openEpubModal(item.id)}>Open Content</Button>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <Alert variant="info">No items found.</Alert>
            )}

            {/* Modal for EPUB Reader */}
            <Modal size="xl" show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>EPUB Reader</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ height: '80vh' }}>
                    {selectedEpub && (
                        <ReactReader
                            url={selectedEpub}
                            location={location}
                            locationChanged={(epubcfi) => setLocation(epubcfi)}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Bookshelf;
