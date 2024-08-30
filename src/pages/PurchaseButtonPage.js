import React from 'react';
import { useParams } from 'react-router-dom';
import PurchaseButton from '../components/PurchaseButton';

function PurchaseButtonPage() {
    const { id } = useParams(); // Fetch the token ID from the URL

    console.log("Token ID from useParams:", id); // Debugging tambahan untuk memastikan `id`

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
            <PurchaseButton id={id} />
        </div>
    );
}

export default PurchaseButtonPage;
