
# Demo
Video :
https://libere-public-10.vercel.app

web :  https://www.youtube.com/watch?v=XoYGTREQ3tk&t=1s

Contract https://opencampus-codex.blockscout.com/address/0x8496454E587254e4A7491Dc1c719954b5bd0355f

Details : https://dorahacks.io/buidl/15906

Libere addresses the limitations of traditional platforms like Kindle, which impose high charge and restrict creators' control over their work, by offering a decentralized alternative that empowers creators to mint and sell their eBooks as NFTs. Additionally, Libere provides an Open Library, which, unlike digital public libraries like Project Gutenberg that offer a limited selection of public domain books, Open Library allows for a diverse range of educational content to be shared and accessed by the OpenCampus community. Users can easily purchase, access, and contribute to this communal digital library, with smart contracts ensuring fair and transparent management of resources.

# Smart Contract


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract LibereLibrary is ERC1155, Ownable, ERC2981, IERC1155Receiver {

    struct Item {
        uint256 id;
        uint256 price;
        address payable recipient;
        uint256 balance;  // Track funds available for withdrawal
    }

    struct AccessInfo {
        uint256 tokenId;
        address user;
        uint256 accessEndTime;
    }

    mapping(uint256 => Item) public items;
    mapping(uint256 => string) private tokenURIs;
    mapping(address => AccessInfo) public accessRegistry;
    mapping(uint256 => uint256) public accessCount; // Track how many users have access to each tokenId

    event ItemCreated(uint256 indexed id, uint256 price, address indexed recipient, address indexed creator, uint96 royalty, string metadataUri);
    event ItemPurchased(address indexed buyer, uint256 indexed id, uint256 amount);
    event ItemPurchasedForLibrary(address indexed buyer, uint256 indexed id, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount);
    event NFTRented(address indexed user, uint256 indexed tokenId, uint256 accessEndTime);

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

    function purchaseItemForLibrary(uint256 id, uint256 amount) public payable {
        Item storage item = items[id];
        require(item.price > 0, "Item does not exist");
        require(msg.value == item.price * amount, "Incorrect Ether value sent");

        // Mint the NFT directly to the contract (library)
        _mint(address(this), id, amount, "");

        // Update the balance available for withdrawal
        item.balance += msg.value;

        emit ItemPurchasedForLibrary(msg.sender, id, amount);
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

    function rentAccess(uint256 id) public {
        require(balanceOf(address(this), id) > 0, "Library does not hold this NFT");
        require(accessCount[id] < balanceOf(address(this), id), "No more access available for this NFT");

        AccessInfo storage accessInfo = accessRegistry[msg.sender];
        require(accessInfo.accessEndTime < block.timestamp, "Previous access still valid");

        accessInfo.tokenId = id;
        accessInfo.user = msg.sender;
        accessInfo.accessEndTime = block.timestamp + 3 days;

        accessCount[id] += 1;

        emit NFTRented(msg.sender, id, accessInfo.accessEndTime);
    }

    function hasAccess(address user, uint256 id) public view returns (bool) {
        AccessInfo memory accessInfo = accessRegistry[user];
        return accessInfo.tokenId == id && accessInfo.accessEndTime > block.timestamp;
    }

    function getAccessInfo(uint256 id) public view returns (uint256 availableNFTs, uint256 accessedNFTs) {
        availableNFTs = balanceOf(address(this), id);
        accessedNFTs = accessCount[id];
        return (availableNFTs, accessedNFTs);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return tokenURIs[id];
    }

    function setURI(uint256 id, string memory newuri) public onlyOwner {
        require(items[id].id > 0, "Item does not exist");
        tokenURIs[id] = newuri;
    }

    function checkBalance(uint256 id) public view returns (uint256) {
        return items[id].balance;
    }

    // Implement the onERC1155Received function to handle single NFT transfers
    function onERC1155Received(
        address, // operator
        address, // from
        uint256, // id
        uint256, // value
        bytes calldata // data
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    // Implement the onERC1155BatchReceived function to handle batch NFT transfers
    function onERC1155BatchReceived(
        address, // operator
        address, // from
        uint256[] calldata, // ids
        uint256[] calldata, // values
        bytes calldata // data
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    // Override supportsInterface to merge ERC1155, ERC2981, and IERC1155Receiver interfaces
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC2981, IERC165) returns (bool) {
        return 
            interfaceId == type(IERC1155Receiver).interfaceId || 
            ERC1155.supportsInterface(interfaceId) || 
            ERC2981.supportsInterface(interfaceId) || 
            interfaceId == type(IERC165).interfaceId;
    }
}



## Main Function :

createItem:  
This function allows the contract owner to create a new NFT. It assigns a price, recipient, and metadata URI to the item. It also sets up royalty information using ERC2981.

purchaseItem:   
Allows a user to purchase a specified amount of an NFT by sending the required amount of Ether. The NFT is then minted to the buyer's address, and the funds are added to the item's balance for withdrawal.

purchaseItemForLibrary:     
Similar to purchaseItem, but the NFT is minted directly to the contract (representing the library). This allows users to buy NFTs that are added to the library's collection.

withdrawFunds:  
Allows the recipient of an item to withdraw the accumulated funds from the sales of their item. The balance is reset after withdrawal to prevent re-entrancy attacks.

rentAccess:     
Allows a user to rent access to an NFT from the library. The user can access the NFT for a limited time (e.g., 3 days). The function checks that the library holds the NFT and that there are available copies for access.

hasAccess:  
Checks if a user currently has access to a specific NFT by verifying if their access time has not expired.

getAccessInfo:  
Returns the number of available NFTs and the number of users who currently have access to a specific NFT in the library.

checkBalance:   
Returns the balance of funds available for withdrawal for a specific item.


