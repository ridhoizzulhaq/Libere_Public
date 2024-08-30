import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Alert, Spinner, Button } from 'react-bootstrap';
import Web3 from 'web3';
import { contractABI, contractAddress } from '../config';

function OpenLibrary() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [renting, setRenting] = useState(false);
    const staticAccount = '0x8496454E587254e4A7491Dc1c719954b5bd0355f'; // Static account for Open Library

    const resolveIPFS = (url) => {
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        return url;
    };

    const fetchItems = async (retryCount = 3) => {
        try {
            setLoading(true);
            const response = await axios.get(`https://opencampus-codex.blockscout.com/api/v2/addresses/${staticAccount}/nft?type=ERC-1155`);

            if (response.status !== 200 || !response.data.items) {
                throw new Error('Unexpected API response');
            }

            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const itemsWithMetadata = await Promise.all(response.data.items.map(async (item) => {
                try {
                    const accessInfo = await contract.methods.getAccessInfo(item.id).call();
                    const uri = await contract.methods.uri(item.id).call();
                    const metadataUrl = resolveIPFS(uri);
                    const metadataResponse = await axios.get(metadataUrl);
                    const metadata = metadataResponse.data;

                    return {
                        ...item,
                        availableNFTs: accessInfo.availableNFTs,
                        accessedNFTs: accessInfo.accessedNFTs,
                        metadata
                    };
                } catch (err) {
                    console.error("Failed to fetch metadata for item:", item.id, err);
                    return { ...item, metadata: null, availableNFTs: 0, accessedNFTs: 0 }; // Default values if fetch fails
                }
            }));

            setItems(itemsWithMetadata);
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

    const rentNFT = async (tokenId) => {
        if (!window.ethereum) {
            alert("Please install MetaMask to continue.");
            return;
        }

        try {
            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            const accessInfo = await contract.methods.accessRegistry(account).call();
            if (accessInfo.accessEndTime > Math.floor(Date.now() / 1000)) {
                alert("Previous access still valid. Please wait until it expires before renting again.");
                return;
            }

            setRenting(true);
            await contract.methods.rentAccess(tokenId).send({ from: account });
            alert('Access granted for 3 days!');
            fetchItems();
        } catch (error) {
            console.error('Failed to rent access:', error);
            alert(`Failed to rent access: ${error.message || error}`);
        } finally {
            setRenting(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

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
            <h2>Open Library</h2>
            {items.length > 0 ? (
                <div className="row">
                    {items.map(item => (
                        <div key={item.id} className="col-md-4 d-flex">
                            <Card className="mb-4 flex-fill" style={{ height: '100%' }}>
                                <Card.Img
                                    variant="top"
                                    src={resolveIPFS(item.metadata?.image || 'default_image_url_here')}
                                    alt={item.metadata?.name || 'No name available'}
                                    style={{ height: '200px', objectFit: 'cover' }}
                                />
                                <Card.Body>
                                    <Card.Title>{item.metadata?.name || 'No name available'}</Card.Title>
                                    <Card.Text>
                                        <strong>ID:</strong> {item.id}<br />
                                        <strong>Description:</strong> {item.metadata?.description || 'No description available'}<br />
                                        <strong>Value:</strong> {item.value} <br />
                                        <strong>OCID ID:</strong> {item.metadata?.ocid_id || 'N/A'}<br />
                                        <strong>Available Contents for rent:</strong> {(item.availableNFTs - item.accessedNFTs)} from {item.availableNFTs} contents
                                    </Card.Text>
                                    {item.availableNFTs > item.accessedNFTs ? (
                                        <Button 
                                            variant="primary" 
                                            onClick={() => rentNFT(item.id)} 
                                            disabled={renting}
                                        >
                                            {renting ? 'Renting...' : 'Rent Access'}
                                        </Button>
                                    ) : (
                                        <Button variant="secondary" disabled>
                                            No Access Available
                                        </Button>
                                    )}
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <Alert variant="info">No items found.</Alert>
            )}
        </div>
    );
}

export default OpenLibrary;
