import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { contractABI, contractAddress } from '../config';

function PurchaseButton() {
    const { id } = useParams(); 
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState("");
    const [hasMetaMask, setHasMetaMask] = useState(true);

    useEffect(() => {
        if (!window.ethereum) {
            setHasMetaMask(false);
            setLoading(false);
            return;
        }

        const fetchItem = async () => {
            try {
                const web3 = new Web3(window.ethereum);
                const contract = new web3.eth.Contract(contractABI, contractAddress);

                const fetchedItem = await contract.methods.items(id).call();
                const metadataUri = await contract.methods.uri(id).call();

                if (!fetchedItem || !fetchedItem.price || !metadataUri) {
                    throw new Error(`Item with ID ${id} does not exist.`);
                }

                const metadataResponse = await fetch(metadataUri);
                const metadata = await metadataResponse.json();

                setItem({
                    ...fetchedItem,
                    metadata,
                });
            } catch (error) {
                console.error("Failed to fetch item or metadata:", error);
                setNotification(`Error fetching item or metadata: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchItem();
    }, [id]);

    const handlePurchase = async () => {
        if (!item) {
            return;
        }

        setLoading(true);
        try {
            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            const transaction = await contract.methods.purchaseItem(id, 1).send({
                from: account,
                value: item.price,
            });

            setNotification(`Purchase successful! Transaction hash: ${transaction.transactionHash}`);
        } catch (error) {
            console.error("Failed to purchase item:", error);
            setNotification(`Error purchasing item: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!hasMetaMask) {
        return (
            <div className="d-flex flex-column align-items-center">
                <Button variant="danger" disabled>
                    MetaMask is required to purchase
                </Button>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column align-items-center">
            {loading ? (
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
                <Button onClick={handlePurchase} variant="primary" disabled={!item}>
                    {item ? `Purchase (${Web3.utils.fromWei(item.price, 'ether')} $EDU)` : 'Loading item...'}
                </Button>
            )}
            {notification && <Alert variant="info" className="mt-3">{notification}</Alert>}
        </div>
    );
}

export default PurchaseButton;
