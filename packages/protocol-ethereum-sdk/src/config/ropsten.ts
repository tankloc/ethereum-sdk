import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import { Config } from "./type"

export const ROPSTEN_CONFIG: Config = {
	basePath: "https://ethereum-api-dev.rarible.org",
	chainId: 3,
	exchange: {
		v1: toAddress("0xd782A10D023828d283f7b943Ae0fc3F07B2952d9"),
		v2: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
		openseaV1: toAddress("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
	},
	transferProxies: {
		nft: toAddress("0xf8e4ecac18b65fd04569ff1f0d561f74effaa206"),
		erc20: toAddress("0xa5a51d7b4933185da9c932e5375187f661cb0c69"),
		erc721Lazy: toAddress("0x6c49c170c82C40709a32Fb4E827ad3011CD86227"),
		erc1155Lazy: toAddress("0x9F7fBc52A53f85e57a5DAde35dFa14797A4dA412"),
		openseaV1: toAddress(ZERO_ADDRESS),
	},
	fees: {
		v2: 0,
	},
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	nftContracts: {
		erc721: {
			v2: toAddress("0x25ec3bbc85af8b7498c8f5b1cd1c39675431a13c"),
			v3: toAddress("0xB0EA149212Eb707a1E5FC1D2d3fD318a8d94cf05"),
		},
		erc1155: {
			v1: toAddress("0x71b053bcaf286ba20d9006845412d4532a8e1f34"),
			v2: toAddress("0x6a94aC200342AC823F909F142a65232E2f052183"),
		},
	},
}
