import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Web3 from 'web3';
import { Container, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { contractABI, contractAddress } from '../config';
import axios from 'axios';

function PurchaseItem() {
    const { id } = useParams();
    const [item, setItem] = useState(null);
    const [royaltyInfo, setRoyaltyInfo] = useState(null);
    const [notification, setNotification] = useState("");
    const [notificationVariant, setNotificationVariant] = useState("info");
    const [loading, setLoading] = useState(true);
    const [hasMetaMask, setHasMetaMask] = useState(true);
    const [ocidId, setOcidId] = useState(null);

    useEffect(() => {
        if (!window.ethereum) {
            setHasMetaMask(false);
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

                const metadataResponse = await axios.get(metadataUri);
                const metadata = metadataResponse.data;

                setItem({
                    ...fetchedItem,
                    metadata,
                });

                if (metadata.ocid_id) {
                    setOcidId(metadata.ocid_id);
                }

                const salePrice = fetchedItem.price;
                const royaltyData = await contract.methods.royaltyInfo(id, salePrice).call();

                const royaltyPercentage = (parseInt(royaltyData[1]) / parseInt(salePrice)) * 100;

                setRoyaltyInfo({
                    recipient: royaltyData[0],
                    amount: Web3.utils.fromWei(royaltyData[1], 'ether'),
                    percentage: royaltyPercentage.toFixed(2)
                });

            } catch (error) {
                setNotificationVariant("danger");
                setNotification(`Error fetching item or metadata: ${error.message || error}`);
            } finally {
                setLoading(false);
            }
        };

        fetchItem();
    }, [id]);

    const handlePurchase = async () => {
        if (!item) {
            setNotificationVariant("warning");
            setNotification("Item not loaded yet. Please wait.");
            return;
        }

        setLoading(true);
        setNotification("");

        try {
            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

            const transaction = await contract.methods.purchaseItem(id, 1).send({
                from: account,
                value: item.price,
            });

            setNotificationVariant("success");
            setNotification(`Purchase successful! Transaction hash: ${transaction.transactionHash}`);
        } catch (error) {
            setNotificationVariant("danger");
            setNotification(`Error purchasing item: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseForLibrary = async () => {
        if (!item) {
            setNotificationVariant("warning");
            setNotification("Item not loaded yet. Please wait.");
            return;
        }

        setLoading(true);
        setNotification("");

        try {
            const web3 = new Web3(window.ethereum);
            const contract = new web3.eth.Contract(contractABI, contractAddress);

            const accounts = await web3.eth.getAccounts();
            const account = accounts[0];

const transaction = await contract.methods.purchaseItemForLibrary(id, 1).send({
    from: account,
    value: item.price,
});

setNotificationVariant("success");
setNotification(`Library purchase successful! Transaction hash: ${transaction.transactionHash}`);
} catch (error) {
setNotificationVariant("danger");
setNotification(`Error purchasing item for library: ${error.message || error}`);
} finally {
setLoading(false);
}
};

if (!hasMetaMask) {
return (
<Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
    <Alert variant="danger">
        MetaMask is not installed. Please install MetaMask to access this page.
    </Alert>
</Container>
);
}

return (
<Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
{loading ? (
    <Spinner animation="border" role="status" style={{ width: '3rem', height: '3rem' }}>
    </Spinner>
) : (
    <Card style={{ maxWidth: '500px', width: '100%' }} className="p-3">
        <Card.Body>
            <Card.Title style={{ fontSize: '1.5rem', color: '#333' }}>
                {item && item.metadata ? item.metadata.name : 'Loading title...'}
            </Card.Title>
            <Card.Text style={{ fontSize: '1rem', color: '#555' }}>
                <strong>ID:</strong> {id}
            </Card.Text>
            <>
                <Card.Img
                    variant="top"
                    src={item.metadata && item.metadata.image ? item.metadata.image : 'path/to/default-image.jpg'}
                    alt={item.metadata ? item.metadata.name : 'Default'}
                    style={{ height: '300px', objectFit: 'cover', marginBottom: '15px' }}
                />
                <Card.Text style={{ fontSize: '1rem', color: '#777' }}>
                    {item.metadata && item.metadata.description ? item.metadata.description : 'No description available.'}
                </Card.Text>

                <Card.Text style={{ fontSize: '1.25rem', color: '#333', fontWeight: 'bold' }}>
                    <strong>Price:</strong> {Web3.utils.fromWei(item.price, 'ether')} $EDU
                </Card.Text>
                <Card.Text style={{ fontSize: '1rem', color: '#777' }}>
                    <strong>Creator:</strong> {item.recipient}
                </Card.Text>

                {royaltyInfo && (
                    <Card.Text style={{ fontSize: '1rem', color: '#777' }}>
                        <strong>Creator Royalty:</strong> {royaltyInfo.percentage}%
                    </Card.Text>
                )}

                {ocidId && (
                    <Card.Text style={{ fontSize: '1rem', color: '#777' }}>
                        <strong>Creator OCID ID:</strong> {ocidId}
                    </Card.Text>
                )}
                <Button onClick={handlePurchase} variant="primary" disabled={loading} className="w-100 mb-3">
                    {loading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                            />{' '}
                            Processing...
                        </>
                    ) : (
                        `Purchase (${Web3.utils.fromWei(item.price, 'ether')} $EDU)`
                    )}
                </Button>

                {/* Tombol baru untuk Purchase for Library */}
                <Button onClick={handlePurchaseForLibrary} variant="secondary" disabled={loading} className="w-100">
                    {loading ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                            />{' '}
                            Processing...
                        </>
                    ) : (
                        `Purchase for Open Library (${Web3.utils.fromWei(item.price, 'ether')} $EDU)`
                    )}
                </Button>
            </>
            {notification && (
                <Alert variant={notificationVariant} className="mt-3">
                    {notification}
                </Alert>
            )}
        </Card.Body>
    </Card>
)}
</Container>
);
}

export default PurchaseItem;
