#!/bin/sh

set -e

# Path to the broadcast artifact (inside container)
# Try different possible paths for the broadcast file
BROADCAST_PATH=""
for path in "./cohort-1-assignments-public/1a/broadcast/MiniAMM.s.sol/1337/run-latest.json" \
            "./cohort-1-assignments-public/1a/broadcast/MiniAMM.s.sol/114/run-latest.json" \
            "./1a/broadcast/MiniAMM.s.sol/1337/run-latest.json" \
            "./1a/broadcast/MiniAMM.s.sol/114/run-latest.json"; do
    if [ -f "$path" ]; then
        BROADCAST_PATH="$path"
        break
    fi
done

echo "📝 Extracting contract addresses..."

# Check if jq is available, if not install it
if ! command -v jq >/dev/null 2>&1; then
    echo "📦 Installing jq..."
    apt update && apt install -y jq
fi

# Check if broadcast file exists
if [ ! -f "$BROADCAST_PATH" ]; then
    echo "❌ Error: Broadcast file not found at $BROADCAST_PATH"
    exit 1
fi

# Initialize contract addresses
MOCK_ERC_0=""
MOCK_ERC_1=""
MINI_AMM=""
MOCK_ERC_COUNT=0

# Extract contract addresses using jq
echo "🔍 Parsing broadcast data..."

# Get all CREATE transactions
CREATE_TRANSACTIONS=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | "\(.contractName)|\(.contractAddress)"' "$BROADCAST_PATH")

# Process each CREATE transaction
echo "$CREATE_TRANSACTIONS" | while IFS='|' read -r contract_name contract_address; do
    if [ "$contract_name" = "MockERC20" ]; then
        if [ $MOCK_ERC_COUNT -eq 0 ]; then
            MOCK_ERC_0="$contract_address"
            echo "Found MockERC20 #0: $contract_address"
        elif [ $MOCK_ERC_COUNT -eq 1 ]; then
            MOCK_ERC_1="$contract_address"
            echo "Found MockERC20 #1: $contract_address"
        fi
        MOCK_ERC_COUNT=$((MOCK_ERC_COUNT + 1))
    elif [ "$contract_name" = "MiniAMM" ]; then
        MINI_AMM="$contract_address"
        echo "Found MiniAMM: $contract_address"
    fi
done

# Since the while loop runs in a subshell, we need to extract the values differently
MOCK_ERC_0=$(jq -r '.transactions[] | select(.transactionType == "CREATE" and .contractName == "MockERC20") | .contractAddress' "$BROADCAST_PATH" | head -n 1)
MOCK_ERC_1=$(jq -r '.transactions[] | select(.transactionType == "CREATE" and .contractName == "MockERC20") | .contractAddress' "$BROADCAST_PATH" | tail -n 1)
MINI_AMM=$(jq -r '.transactions[] | select(.transactionType == "CREATE" and .contractName == "MiniAMM") | .contractAddress' "$BROADCAST_PATH")

# Create the deployment JSON
cat > ./deployment.json << EOF
{
    "mock_erc_0": "$MOCK_ERC_0",
    "mock_erc_1": "$MOCK_ERC_1",
    "mini_amm": "$MINI_AMM"
}
EOF

echo "✅ Contract addresses extracted to deployment.json:"
echo "MockERC20 #0: $MOCK_ERC_0"
echo "MockERC20 #1: $MOCK_ERC_1"
echo "MiniAMM: $MINI_AMM"

# Pretty print the JSON
echo ""
echo "📄 deployment.json contents:"
cat ./deployment.json
