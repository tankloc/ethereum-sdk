import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import type { OrderForm } from "@rarible/ethereum-api-client"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	OrderControllerApi,
} from "@rarible/ethereum-api-client"
import { createE2eProvider, createE2eWallet } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils"
import { getEthereumConfig } from "../config"
import { getApiConfig } from "../config/api-config"
import type { ERC721RequestV3 } from "../nft/mint"
import { mint as mintTemplate } from "../nft/mint"
import { createTestProviders } from "../common/create-test-providers"
import { send as sendTemplate, simpleSend } from "../common/send-transaction"
import { signNft as signNftTemplate } from "../nft/sign-nft"
import { createErc721V3Collection } from "../common/mint"
import { retry } from "../common/retry"
import { createEthereumApis } from "../common/apis"
import { OrderBid } from "./bid"
import { signOrder as signOrderTemplate } from "./sign-order"
import { OrderFiller } from "./fill-order"
import { UpsertOrder } from "./upsert-order"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { createErc20Contract } from "./contracts/erc20"
import { checkChainId } from "./check-chain-id"

const { provider, wallet } = createE2eProvider(
	"d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469"
)
const { providers } = createTestProviders(provider, wallet)

describe.each(providers)("bid", (ethereum) => {
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const orderApi = new OrderControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const config = getEthereumConfig("e2e")
	const signOrder = signOrderTemplate.bind(null, ethereum, config)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const signNft = signNftTemplate.bind(null, ethereum, config.chainId)
	const apis = createEthereumApis("e2e")
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const mint = mintTemplate
		.bind(null, ethereum, send, signNft, nftCollectionApi)
		.bind(null, nftLazyMintApi, checkWalletChainId)

	const orderService = new OrderFiller(ethereum, simpleSend, config, apis)

	const upserter = new UpsertOrder(
		orderService,
		(x) => Promise.resolve(x),
		() => Promise.resolve(undefined),
		signOrder,
		orderApi,
		ethereum,
		checkWalletChainId,
	)
	const orderSell = new OrderBid(upserter, checkAssetType, checkWalletChainId)
	const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const treasury = createE2eWallet()
	const treasuryAddress = toAddress(treasury.getAddressString())

	const erc20Contract = toAddress("0xfB771AEc4740e4b9B6b4C33959Bf6183E00812d7")
	beforeAll(async () => {
		await send(
			createErc20Contract(ethereum, erc20Contract)
				.functionCall("mint", await ethereum.getFrom(), 1000)
		)
	})

	test("create and update of v2 works", async () => {
		const makerAddress = toAddress(wallet.getAddressString())
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "ipfs://ipfs/hash",
			creators: [{
				account: makerAddress,
				value: 10000,
			}],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)

		const order = await orderSell.bid({
			maker: toAddress(wallet.getAddressString()),
			takeAssetType: {
				assetClass: "ERC721",
				contract: minted.contract,
				tokenId: minted.tokenId,
			},
			price: toBn("100"),
			makeAssetType: {
				assetClass: "ERC20",
				contract: erc20Contract,
			},
			amount: 1,
			payouts: [],
			originFees: [{
				account: treasuryAddress,
				value: 100,
			}],
		})

		expect(order.hash).toBeTruthy()

		await retry(5, 500, async () => {
			const nextPrice = "40000000000000000"
			const updatedOrder = await orderSell.update({
				orderHash: order.hash,
				price: toBigNumber(nextPrice),
			})

			expect(updatedOrder.make.value.toString()).toBe(nextPrice)
		})

	})

	test("create and update of v1 works", async () => {
		const makerAddress = toAddress(wallet.getAddressString())
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "ipfs://ipfs/hash",
			creators: [{
				account: makerAddress,
				value: 10000,
			}],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)

		const form: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			maker: makerAddress,
			take: {
				assetType: {
					assetClass: "ERC721",
					contract: minted.contract,
					tokenId: minted.tokenId,
				},
				value: toBigNumber("1"),
			},
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: erc20Contract,
				},
				value: toBigNumber("10000000000000000"),
			},
			salt: toBigNumber("10"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 250,
			},
			signature: toBinary("0x"),
		}
		const order = await upserter.upsert({ order: form })

		await retry(5, 500, async () => {
			const nextPrice = "20000000000000000"
			const updatedOrder = await orderSell.update({
				orderHash: order.hash,
				price: toBigNumber(nextPrice),
			})

			expect(updatedOrder.make.value.toString()).toBe(nextPrice)
		})
	})
})
