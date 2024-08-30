import React, { createContext, useState, useContext } from 'react';

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);

    return (
        <Web3Context.Provider value={{ account, setAccount, contract, setContract }}>
            {children}
        </Web3Context.Provider>
    );
};

// Custom hook untuk menggunakan Web3Context
export const useWeb3 = () => {
    return useContext(Web3Context);
};
