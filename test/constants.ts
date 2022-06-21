import { BigNumber, ethers } from "ethers";

const ZeroAddress = "0x0000000000000000000000000000000000000000";
const now = Math.floor(new Date().getTime() / 1000);
export const seconds_in_a_day = 60 * 60 * 24;
export const MaxNumberOfNFT = 24;
export const qualification_project_name = "MASK";
export const qualification_verifier = "0x720272934CE8e42106f7d4F79B666C52030FCdA6";
export const holderMinAmount = ethers.utils.parseUnits("100", 18);

export const MaskNFTInitParameters = {
  mainnet: {
    name: "Mask Test NFT",
    symbol: "MaskTestNFT",
    baseURI: "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json",
  },
  rinkeby: {
    name: "Mask Test NFT",
    symbol: "MaskTestNFT",
    baseURI: "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json",
  },
  ropsten: {
    name: "Mask Test NFT",
    symbol: "MaskTestNFT",
    baseURI: "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json",
  },
  matic_mainnet: {
    name: "Mask Test NFT",
    symbol: "MaskTestNFT",
    baseURI: "https://raw.githubusercontent.com/andy-at-mask/MysteryBoxAsset/master/json/default.json",
  },
};

export interface TxParameter {
  gasLimit?: BigNumber;
  value: BigNumber;
}

type Payment = [string, BigNumber];

interface BoxCreationParam {
  nft_address: string;
  name: string;
  payment: Payment[];
  personal_limit: number;
  start_time: number;
  end_time: number;
  sell_all: boolean;
  nft_id_list: number[];
  qualification: string;
  holder_token_addr: string;
  holder_min_token_amount: BigNumber;
  qualification_data: string;
  txParam?: TxParameter;
}

export function generateCreateBoxPara(network: string): BoxCreationParam {
  const payment: Payment[] = [[ZeroAddress, ethers.utils.parseUnits("0.1", "ether")]];
  let para = {
    nft_address: ZeroAddress,
    name: "Mask Test NFT Sale",
    payment,
    personal_limit: MaxNumberOfNFT,
    start_time: 0,
    end_time: now + seconds_in_a_day * 90,
    sell_all: true,
    nft_id_list: [],
    qualification: ZeroAddress,
    holder_token_addr: ZeroAddress,
    holder_min_token_amount: ethers.constants.Zero,
    qualification_data: "0x0000000000000000000000000000000000000000000000000000000000000000",
  };
  if (network === "rinkeby") {
    para.nft_address = "0x0c8FB5C985E00fb1D002b6B9700084492Fb4B9A8";
  } else if (network === "matic_mainnet") {
    para.nft_address = "0x49C2a3D93C4B94eAd101d9936f1ebCA634394a78";
  }
  return para;
}

interface OpenBoxPara {
  box_id: BigNumber;
  amount: number;
  payment_token_index: number;
  proof: string;
  txParam?: TxParameter;
}

export const openBoxParameters: OpenBoxPara = {
  box_id: BigNumber.from(1),
  amount: 1,
  payment_token_index: 0,
  proof: "0x",
};

export function addTxParameters(
  para: BoxCreationParam | OpenBoxPara,
  txParam: TxParameter,
): BoxCreationParam | OpenBoxPara {
  return {
    ...para,
    txParam,
  };
}
