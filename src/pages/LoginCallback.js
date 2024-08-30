import React, { useEffect } from 'react';
import { useOCAuth } from '@opencampus/ocid-connect-js';
import { useNavigate } from 'react-router-dom';

function LoginCallback() {
    const { ocAuth } = useOCAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleRedirect = async () => {
            try {
                // Langsung periksa status otentikasi tanpa `handleRedirectCallback`
                const isAuthenticated = ocAuth.isAuthenticated();
                if (isAuthenticated) {
                    const userInfo = ocAuth.getAuthInfo();
                    if (userInfo && userInfo.edu_username) {
                        localStorage.setItem('ocid', userInfo.edu_username);
                        navigate('/');
                    } else {
                        throw new Error('User information is missing.');
                    }
                } else {
                    throw new Error('User is not authenticated.');
                }
            } catch (error) {
                console.error('OCID redirect handling failed:', error);
                navigate('/');  // Redirect ke halaman utama jika ada kesalahan
            }
        };

        handleRedirect();
    }, [ocAuth, navigate]);

    return <div>Loading...</div>;
}

export default LoginCallback;
