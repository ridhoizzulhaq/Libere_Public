import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ReactReader } from 'react-reader';

function EpubReader() {
    const { tokenId } = useParams(); // Get the tokenId from the URL
    const [location, setLocation] = useState(0);

    return (
        <div style={{ height: '100vh' }}>
            <ReactReader
                url={`http://localhost:5001/epubs/${tokenId}.epub`}
                location={location}
                locationChanged={(epubcfi) => setLocation(epubcfi)}
            />
        </div>
    );
}

export default EpubReader;
