import React, { useState } from 'react';
import Web3 from 'web3';
import { Button, Modal, Spinner } from 'react-bootstrap';
import { contractABI, contractAddress } from '../config';

const CheckBalance = ({ selectedTokenId, show, onHide, account }) => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    const checkBalance = async () => {
        setLoading(true);
        try {
            if (!window.ethereum) {
                alert('MetaMask is not installed. Please install MetaMask to interact with this feature.');
                setLoading(false);
                return;
            }

            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            // Call checkBalance with msg.sender
            const balance = await contract.methods.checkBalance(selectedTokenId).call({ from: account });
            setBalance(Web3.utils.fromWei(balance, 'ether')); // Convert balance to Ether for display
        } catch (error) {
            console.error("Failed to check balance:", error);
            alert('Failed to check balance. Please try again.');
        } finally {
            setLoading(false);
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
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            // Withdraw funds associated with msg.sender and the specific token ID
            await contract.methods.withdrawFunds(selectedTokenId).send({ from: account });

            alert('Withdrawal successful!');
            onHide();  // Close the modal after withdrawal
        } catch (error) {
            console.error("Withdrawal failed:", error);
            alert('Withdrawal failed. Please try again.');
        } finally {
            setWithdrawing(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Check Balance for Token ID: {selectedTokenId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? (
                    <Spinner animation="border" variant="primary" />
                ) : (
                    balance !== null ? (
                        <>
                            <p>Balance: {balance} $EDU</p>
                            {balance > 0 && (
                                <Button variant="success" onClick={handleWithdraw} disabled={withdrawing}>
                                    {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button variant="primary" onClick={checkBalance}>
                            Check Balance
                        </Button>
                    )
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CheckBalance;
