// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract Libere is ERC1155, Ownable, ERC2981 {

    struct Item {
        uint256 id;
        uint256 price;
        address payable recipient;
        uint256 balance;  // track funds available for withdrawal
    }

    mapping(uint256 => Item) public items;
    mapping(uint256 => string) private tokenURIs;
    
    event ItemCreated(uint256 indexed id, uint256 price, address indexed recipient, address indexed creator, uint96 royalty, string metadataUri);
    event ItemPurchased(address indexed buyer, uint256 indexed id, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount);
    
    constructor() ERC1155("Libere") Ownable(msg.sender) {}

    function createItem(
        uint256 id, 
        uint256 price, 
        address payable recipient, 
        address royaltyRecipient, 
        uint96 royaltyValue, 
        string memory metadataUri
    ) 
        public 
        onlyOwner 
    {
        require(recipient != address(0), "Invalid recipient address");
        require(price > 0, "Price must be greater than zero");
        require(royaltyValue <= 1000, "Royalty too high");

        items[id] = Item({
            id: id,
            price: price,
            recipient: recipient,
            balance: 0  // Initialize balance
        });

        tokenURIs[id] = metadataUri;

        // Set royalty info using ERC-2981
        _setTokenRoyalty(id, royaltyRecipient, royaltyValue);

        emit ItemCreated(id, price, recipient, royaltyRecipient, royaltyValue, metadataUri);
    }

    function purchaseItem(uint256 id, uint256 amount) public payable {
        Item storage item = items[id];
        require(item.price > 0, "Item does not exist");
        require(msg.value == item.price * amount, "Incorrect Ether value sent");

        _mint(msg.sender, id, amount, "");

        // Update the balance available for withdrawal
        item.balance += msg.value;

        emit ItemPurchased(msg.sender, id, amount);
    }

    function withdrawFunds(uint256 id) public {
        Item storage item = items[id];
        require(msg.sender == item.recipient, "Only the recipient can withdraw");
        uint256 amount = item.balance;
        require(amount > 0, "No funds available for withdrawal");

        item.balance = 0;  // Reset the balance before sending to prevent re-entrancy attacks
        (bool success, ) = item.recipient.call{value: amount}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(item.recipient, amount);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return tokenURIs[id];
    }

    function setURI(uint256 id, string memory newuri) public onlyOwner {
        require(items[id].id > 0, "Item does not exist");
        tokenURIs[id] = newuri;
    }

    // Check available balance for withdrawal by recipient
    function checkBalance(uint256 id) public view returns (uint256) {
        return items[id].balance;
    }

    // Override supportsInterface to merge ERC1155 and ERC2981
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981) returns (bool) {
        return ERC1155.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }
}
