import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { ChainId, BlockExplorer, AddressTable } from './types';
import { parse } from "csv-parse/sync";

const README_PATH = path.resolve(__dirname, "..", "README.md");
const ADDRESS_TABLE_PATH = path.resolve(__dirname, "contract-addresses.csv");

async function main() {
  const content = await fs.readFile(README_PATH, "utf-8");
  const addressData = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8");
  const addresses: Array<AddressTable> = scanTable(addressData);
  const mainReplaced = replace(
    content,
    "main",
    Array.from(makeMainTable(addresses)).join("\n")
  );
  const qlfReplaced = replace(
    mainReplaced,
    "Qualification",
    Array.from(makeQlfTable(addresses)).join("\n")
  );
  const formatted = format(qlfReplaced, {
    parser: "markdown",
    printWidth: 160,
  });
  await fs.writeFile(README_PATH, formatted, "utf-8");
}

main();

function* makeMainTable(addressTable: Array<AddressTable>) {
  yield "| Chain | MysteryBox | MaskTestNFT |";
  yield "| - | - | - |";
  for (let i = 0; i < addressTable.length; i++) {
    const chain = addressTable[i].Chain;
    const mbElement = formElement(addressTable[i].MysteryBox, `mb-${chain}`);
    const nftElement = formElement(addressTable[i].MaskTestNFT, `nft-${chain}`);
    yield `| ${chain} | ${mbElement} | ${nftElement} |`;
  }
  yield "";
  for (let i = 0; i < addressTable.length; i++) {
    const link = formLink(addressTable[i].MysteryBox, addressTable[i].Chain, "mb");
    if (link == null) continue;
    yield link;
  }
  for (let i = 0; i < addressTable.length; i++) {
    const link = formLink(addressTable[i].MaskTestNFT, addressTable[i].Chain, "nft");
    if (link == null) continue;
    yield link;
  }
}

function* makeQlfTable(addressTable: Array<AddressTable>) {
  yield "| Chain | WhitelistQlf | SigVerifyQlf | MaskHolderQlf | MerkleProofQlf |";
  yield "| - | - | - | - | - |";
  for (let i = 0; i < addressTable.length; i++) {
    const chain = addressTable[i].Chain;
    const wlElement = formElement(addressTable[i].WhitelistQlf, `wl-${chain}`);
    const svElement = formElement(addressTable[i].SigVerifyQlf, `sv-${chain}`);
    const mhElement = formElement(addressTable[i].MaskHolderQlf, `mh-${chain}`);
    const mpElement = formElement(addressTable[i].MerkleProofQlf, `mp-${chain}`);
    yield `| ${chain} | ${wlElement} | ${svElement} | ${mhElement} | ${mpElement} |`;
  }
  yield "";
  for (let i = 0; i < addressTable.length; i++) {
    const wlLink = formLink(addressTable[i].WhitelistQlf, addressTable[i].Chain, "wl");
    if (wlLink != null) yield wlLink;
    const svLink = formLink(addressTable[i].SigVerifyQlf, addressTable[i].Chain, "sv");
    if (svLink != null) yield svLink;
    const mhLink = formLink(addressTable[i].MaskHolderQlf, addressTable[i].Chain, "mh");
    if (mhLink != null) yield mhLink;
    const mpLink = formLink(addressTable[i].MerkleProofQlf, addressTable[i].Chain, "mp");
    if (mpLink != null) yield mpLink;
  }
}

function scanTable(addressData: string) {
  const headers = ['Chain', 'MysteryBox', 'MaskTestNFT', 'WhitelistQlf', 'SigVerifyQlf', 'MaskHolderQlf', 'MerkleProofQlf']
  const result: Array<AddressTable> = parse(addressData, {
    delimiter: ',',
    columns: headers,
    from: 2
  });
  return result;
}

function formElement(address: string, linkTag: string) {
  if (address == '') {
    return ''
  }
  return `[\`${address.substr(0, 10)}\`][${linkTag}]`;
}

function formLink(address: string, chain: string, contract: string) {
  if (address == '') {
    return null;
  }
  const requiredChainId: ChainId = getEnumAsArray(ChainId).get(chain);
  const browserPath = BlockExplorer[requiredChainId](address);
  return `[${contract}-${chain}]: ${browserPath}`;
}

function replace(content: string, name: string, replace: string) {
  const pattern = new RegExp(
    `(<!-- begin ${name} -->)(.+)(<!-- end ${name} -->)`,
    "gs"
  );
  return content.replace(pattern, `$1\n${replace}\n$3`);
}

function getEnumAsArray<T extends object>(enumObject: T) {
  const keys = Object.keys(enumObject).filter((x) => Number.isNaN(Number.parseInt(x)));
  const map = new Map();
  for (let i = 0; i < keys.length; i++) {
    map.set(keys[i], enumObject[keys[i] as keyof T]);
  }
  return map;
}
