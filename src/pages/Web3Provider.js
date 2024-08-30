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

export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (context === null) {
        throw new Error("useWeb3 must be used within a Web3Provider");
    }
    return context;
};
