import path from "path";
import fs from "fs/promises";
import { format } from "prettier";
import { getAllBrowserPath } from "./SmartContractProjectConfig/chains";
import { parse } from "csv-parse/sync";

const README_PATH = path.resolve(__dirname, "README.md");
const ADDRESS_TABLE_PATH = path.resolve(__dirname, "contract-addresses.csv");
let contractPath: Record<string, string>;
type DeployedAddressRow = {
  Chain: string;
  MysteryBox: string;
  MaskTestNFT: string;
  WhitelistQlf: string;
  SigVerifyQlf: string;
  MaskHolderQlf: string;
  MerkleProofQlf: string;
};

async function main() {
  let content = await fs.readFile(README_PATH, "utf-8");
  contractPath = await getAllBrowserPath("address");
  const rows: DeployedAddressRow[] = await loadDeployedAddressRows();
  content = replace(content, "main", Array.from(makeMainTable(rows)).filter(Boolean).join("\n"));
  content = replace(content, "Qualification", Array.from(makeQlfTable(rows)).filter(Boolean).join("\n"));
  const formatted = format(content, {
    parser: "markdown",
    printWidth: 160,
  });
  await fs.writeFile(README_PATH, formatted, "utf-8");
}

main();

function* makeMainTable(rows: DeployedAddressRow[]) {
  yield "| Chain | MysteryBox | MaskTestNFT |";
  yield "| - | - | - |";
  for (const { Chain, MysteryBox, MaskTestNFT } of rows) {
    const mbElement = formElement(MysteryBox, `mb-${Chain}`);
    const nftElement = formElement(MaskTestNFT, `nft-${Chain}`);
    yield `| ${Chain} | ${mbElement} | ${nftElement} |`;
  }
  yield "";
  yield* rows.map(({ Chain, MysteryBox }) => formLink(MysteryBox, Chain, "mb"));
  yield* rows.map(({ Chain, MaskTestNFT }) => formLink(MaskTestNFT, Chain, "nft"));
}

function* makeQlfTable(rows: DeployedAddressRow[]) {
  yield "| Chain | WhitelistQlf | SigVerifyQlf | MaskHolderQlf | MerkleProofQlf |";
  yield "| - | - | - | - | - |";
  for (const { Chain, WhitelistQlf, SigVerifyQlf, MaskHolderQlf, MerkleProofQlf } of rows) {
    const wlElement = formElement(WhitelistQlf, `wl-${Chain}`);
    const svElement = formElement(SigVerifyQlf, `sv-${Chain}`);
    const mhElement = formElement(MaskHolderQlf, `mh-${Chain}`);
    const mpElement = formElement(MerkleProofQlf, `mp-${Chain}`);
    yield `| ${Chain} | ${wlElement} | ${svElement} | ${mhElement} | ${mpElement} |`;
  }
  yield "";
  for (const { Chain, WhitelistQlf, SigVerifyQlf, MaskHolderQlf, MerkleProofQlf } of rows) {
    yield formLink(WhitelistQlf, Chain, "wl");
    yield formLink(SigVerifyQlf, Chain, "sv");
    yield formLink(MaskHolderQlf, Chain, "mh");
    yield formLink(MerkleProofQlf, Chain, "mp");
  }
}

async function loadDeployedAddressRows(): Promise<DeployedAddressRow[]> {
  const data = await fs.readFile(ADDRESS_TABLE_PATH, "utf-8");
  const columns = [
    "Chain",
    "MysteryBox",
    "MaskTestNFT",
    "WhitelistQlf",
    "SigVerifyQlf",
    "MaskHolderQlf",
    "MerkleProofQlf",
  ];
  return parse(data, { delimiter: ",", columns, from: 2 });
}

function formElement(address: string, linkTag: string) {
  if (address == "") {
    return "";
  }
  return `[\`${address.slice(0, 10)}\`][${linkTag}]`;
}

function formLink(address: string, chain: string, contract: string) {
  if (address == "") {
    return null;
  }
  const browserPath = contractPath[chain] + address;
  return `[${contract}-${chain}]: ${browserPath}`;
}

function replace(content: string, name: string, replace: string) {
  const pattern = new RegExp(`(<!-- begin ${name} -->)(.+)(<!-- end ${name} -->)`, "gs");
  return content.replace(pattern, `$1\n${replace}\n$3`);
}

function getEnumAsMap<T extends object>(enumObject: T) {
  const pairs = new Map<string, T[keyof T]>();
  for (const key of Object.keys(enumObject)) {
    if (Number.isNaN(Number.parseInt(key))) {
      pairs.set(key, enumObject[key as keyof T]);
    }
  }
  return pairs;
}
