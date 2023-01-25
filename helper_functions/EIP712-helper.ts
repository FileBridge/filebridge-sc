import { ethers, network } from "hardhat"
import { Address } from "hardhat-deploy/dist/types"

const abiCoder = new ethers.utils.AbiCoder()

/**
 * @dev The Domain seperator according to EIP 712
 * @param _typeHash The keccak256 of "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
 * @param _nameHash The keccak256 of contract name
 * @param _versionHash The keccak256 of version (1)
 * @param _contractAddress The contract address
 * @return Domain seperator
 */
export function buildDomainSeparator(
    _typeHash: string,
    _nameHash: string,
    _versionHash: string,
    _contractAddress: string
): string {
    return ethers.utils.keccak256(
        abiCoder.encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [
                _typeHash,
                _nameHash,
                _versionHash,
                network.config.chainId,
                _contractAddress,
            ]
        )
    )
}

/**
 * @dev The struct hash builder according to EIP 712
 * @param _functionTypeHash The keccak256 of the functione type hash
 * @param _owner Owner of the token
 * @param _spender Spender of the token
 * @param _value Value of the token
 * @param _nonce The ERC20 permit nonce of the owner
 * @param _deadline deadline of the permit
 * @return structHash
 */
export function buildStructHashPermit(
    _functionTypeHash: string,
    _owner: Address,
    _spender: Address,
    _value: string,
    _nonce: string,
    _deadline: string
): string {
    return ethers.utils.keccak256(
        abiCoder.encode(
            ["bytes32", "address", "address", "uint256", "uint256", "uint256"],
            [_functionTypeHash, _owner, _spender, _value, _nonce, _deadline]
        )
    )
}

/**
 * @dev The data hash according to EIP 712
 * @param _domainSeparator The domain seperator
 * @param _structHash The keccak256 of struct hash
 * @return Data type hash
 */
export function toTypedDataHash(
    _domainSeparator: string,
    _structHash: string
): string {
    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ["string", "bytes32", "bytes32"],
            ["\x19\x01", _domainSeparator, _structHash]
        )
    )
}
