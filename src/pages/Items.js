
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWeb3 } from '../components/Web3Provider';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form'; // Import Form component
import Web3 from 'web3';
import { contractABI, contractAddress } from '../config';
import moment from 'moment';

function Items() {
    const { account } = useWeb3();  // Assuming useWeb3 provides the connected MetaMask account
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTokenId, setSelectedTokenId] = useState(null);
    const [showIframeModal, setShowIframeModal] = useState(false);
    const [iframeCode, setIframeCode] = useState('');
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balance, setBalance] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        const fetchItems = async () => {
            if (!account) return;
            try {
                const response = await axios.get(`http://localhost:5001/api/items/${account}`);
                const formattedItems = await Promise.all(
                    response.data.map(async item => {
                        try {
                            const metadataResponse = await axios.get(item.metadata_uri);
                            const metadata = metadataResponse.data;

                            return {
                                ...item,
                                price: parseFloat(item.price).toFixed(4),
                                royalty: Math.round(parseFloat(item.royalty) / 100),
                                metadata,
                                formattedTimestamp: moment(item.timestamp).format('MMMM Do YYYY, h:mm:ss a')
                            };
                        } catch (metadataError) {
                            console.error(`Failed to fetch metadata for token_id ${item.token_id}:`, metadataError);
                            return {
                                ...item,
                                price: parseFloat(item.price).toFixed(4),
                                royalty: Math.round(parseFloat(item.royalty) / 100),
                                metadata: null,
                                formattedTimestamp: moment(item.timestamp).format('MMMM Do YYYY, h:mm:ss a')
                            };
                        }
                    })
                );
                setItems(formattedItems);
            } catch (error) {
                console.error("Failed to fetch items:", error);
            } finally {
                setLoading(false);
            }
        };

        if (account) {
            fetchItems();
        }
    }, [account]);

    const handleViewDetails = (token_id) => {
        const newTabUrl = `/purchase/${token_id}`;
        window.open(newTabUrl, '_blank');
    };

    const handleShowIframe = (token_id) => {
        const iframeSrc = `/purchase/${token_id}/iframe`;
        const code = `<iframe src="${window.location.origin}${iframeSrc}" width="300" height="400" frameborder="0"></iframe>`;
        setIframeCode(code);
        setShowIframeModal(true);
    };

    const handleShowBalanceModal = async (token_id) => {
        setSelectedTokenId(token_id);
        setBalance(null); // Reset balance state when opening a new modal
        setShowBalanceModal(true);
        await checkBalance(token_id); // Fetch balance when modal is opened
    };

    const checkBalance = async (token_id) => {
        setLoadingBalance(true);
        try {
            if (!window.ethereum) {
                alert('MetaMask is not installed. Please install MetaMask to interact with this feature.');
                setLoadingBalance(false);
                return;
            }

            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const balance = await contract.methods.checkBalance(token_id).call();
            setBalance(Web3.utils.fromWei(balance, 'ether')); // Convert balance from wei to ether
        } catch (error) {
            console.error("Failed to check balance:", error);
            alert('Failed to check balance. Please try again.');
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleWithdraw = async () => {
        setWithdrawing(true);
        try {
            if (!window.ethereum) {
                alert('MetaMask is not installed. Please install MetaMask to interact with this feature.');
                setWithdrawing(false);
                return;
            }

            const web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            const contract = new web3.eth.Contract(contractABI, contractAddress);
            await contract.methods.withdrawFunds(selectedTokenId).send({ from: account });

            alert('Withdrawal successful!');
            setShowBalanceModal(false);  // Close the modal after withdrawal
        } catch (error) {
            console.error("Withdrawal failed:", error);
            alert('Withdrawal failed. Please try again.');
        } finally {
            setWithdrawing(false);
        }
    };

    return (
        <div className="container">
            <h2>My Items:</h2>
            {loading ? (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <div className="row">
                    {items.length > 0 ? (
                        items.map(item => (
                            <div key={item.token_id} className="col-md-4 d-flex">
                                <Card className="mb-4 flex-fill" style={{ height: '100%' }}>
                                    <Card.Img
                                        variant="top"
                                        src={item.metadata && item.metadata.image ? item.metadata.image : 'path/to/default-image.jpg'}
                                        alt={item.metadata ? item.metadata.name : 'Default'}
                                        style={{ height: '200px', objectFit: 'cover' }}
                                    />
                                    <Card.Body>
                                        <Card.Title>{item.metadata ? item.metadata.name : 'No title available'}</Card.Title>
                                        <Card.Text>
                                            <strong>ID:</strong> {item.token_id}<br />
                                            {item.metadata ? (
                                                <>
                                                    <strong>Description:</strong> {item.metadata.description}<br />
                                                </>
                                            ) : (
                                                <strong>No metadata available</strong>
                                            )}
                                            <strong>Price:</strong> {item.price} $EDU<br />
                                            <strong>Recipient:</strong> {item.recipient}<br />
                                            <strong>Royalty Recipient:</strong> {item.royalty_recipient}<br />
                                            <strong>Royalty:</strong> {item.royalty}%<br />
                                            <strong>Date Added:</strong> {item.formattedTimestamp}
                                        </Card.Text>
                                        <Button
                                            onClick={() => handleViewDetails(item.token_id)}
                                            variant="primary"
                                            className="w-100 mb-2"
                                        >
                                            Open your Minting Page
                                        </Button>
                                        <Button
                                            onClick={() => handleShowIframe(item.token_id)}
                                            variant="secondary"
                                            className="w-100 mb-2"
                                        >
                                            Insert Purchase Button on your Web
                                        </Button>
                                        <Button
                                            onClick={() => handleShowBalanceModal(item.token_id)}
                                            variant="info"
                                            className="w-100"
                                        >
                                            Check Revenue & Withdraw
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </div>
                        ))
                    ) : (
                        <p>No items found</p>
                    )}
                </div>
            )}

            {/* Modal for checking balance */}
            <Modal show={showBalanceModal} onHide={() => setShowBalanceModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Check Balance for Token ID: {selectedTokenId}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingBalance ? (
                        <Spinner animation="border" variant="primary" />
                    ) : (
                        <>
                            <p>Balance: {balance !== null ? balance : 'N/A'} $EDU</p>
                            {balance > 0 && (
                                <Button variant="success" onClick={handleWithdraw} disabled={withdrawing}>
                                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                                </Button>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBalanceModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal for iframe */}
            <Modal show={showIframeModal} onHide={() => setShowIframeModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Purchase Button</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Embed Code</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={iframeCode}
                            readOnly
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowIframeModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Items;