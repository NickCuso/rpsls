var Contract = function() 
{
  LocalContractStorage.defineMapProperty(this, "id_to_game");
  LocalContractStorage.defineMapProperty(this, "addr_to_game_list");
  LocalContractStorage.defineMapProperty(this, "addr_to_score");
  // public_games, players (with scores)
  LocalContractStorage.defineMapProperty(this, "lists");  
}

Contract.prototype = 
{
  init: function() 
  {
    this.addr_to_game_list.put(0, []);
    this.lists.put("public_games", []);
    this.lists.put("players", []);
  },

  startGame: function(seed, selection_hash, is_public)
  {
    if(!selection_hash)
    {
      throw new Error("Make a selection and send the hash to start a game.");
    }

    var game_id = Blockchain.transaction.hash;
    var game = {
      seed,
      players: [{addr: Blockchain.transaction.from, selection_hash}]
    };
    this.id_to_game.put(game_id, game);
    addPlayerGame(this, game_id);

    if(is_public)
    {
      var public_games = this.lists.get("public_games");
      public_games.push(game_id);
      this.lists.put("public_games", public_games);
    }
  },

  joinGame: function(game_id, selection)
  {
    assertIsValidSelection(selection);

    var game = this.getGame(game_id);

    if(game.players.length > 1)
    {
      throw new Error("That game is already full, select another or start a new game.");
    }

    game.date_started = Date.now();
    game.players.push({addr: Blockchain.transaction.from, selection});
    this.id_to_game.put(game_id, game);
    addPlayerGame(this, game_id);
  },

  endGame: function(game_id, selection, salt)
  {
    assertIsValidSelection(selection);

    var game = this.getGame(game_id);
    if(!game)
    {
      throw new Error("Game not found, you entered: " + game_id);
    }
    if(game.players[0].addr != Blockchain.transaction.from)
    {
      throw new Error("You did not start that game.  Get outa here!");
    }
    if(game.players.length < 2)
    {
      throw new Error("That game has not started yet... Please wait for an opponent to join.");
    }

    var hash = sha256(salt + selection);
    if(game.players[0].selection_hash != hash)
    {
      throw new Error("CHEATER!!!  That hash does not match the original. Salt: " + salt + ", Selection: " + selection);
    }

    game.players[0].selection = selection;
    game.winner = getWinner(selection, game.players[1].selection);
    this.id_to_game.put(game_id, game);
    addScore(this, game);

    var public_games = this.lists.get("public_games");
    var index = public_games.indexOf(game_id);
    if(index >= 0)
    {
      public_games.splice(index, 1);
      this.lists.put("public_games", public_games);
    }

    removeGameFromPlayerList(this, game.players[0].addr, game_id);
    removeGameFromPlayerList(this, game.players[1].addr, game_id);

    return game.winner;
  },

  timeout: function() 
  {
    var game = this.getGame(game_id);
    if(game.players[0].addr != Blockchain.transaction.from)
    {
      throw new Error("You did not start that game.  Get outa here!");
    }
    var time_passed = Date.now() - game.date_started;
    if(time_passed < 1000 * 60 * 60 * 24)
    {
      throw new Error("Please give your opponent a day to respond..");
    }

    game.winner = 0;
    game.was_timeout = true;
    this.id_to_game.put(game_id, game);
    addScore(this, game);
  },

  listPublicGames: function()
  {
    return this.lists.get("public_games");
  },
  
  getScoreOfUser: function(addr)
  {
    return this.addr_to_score.get(addr);
  },

  getPlayerList: function()
  {
    return this.lists.get("players");
  },

  getGamesForUser: function(addr)
  {
    return this.addr_to_game_list.get(addr);
  },

  getMyGames: function()
  {
    return this.getGamesForUser(Blockchain.transaction.from);
  },

  getGame: function(game_id)
  {
    var game = this.id_to_game.get(game_id);
    if(game.players[0].addr == Blockchain.transaction.from)
    {
      game.your_player_id = 0;
    }
    else if(game.players.length > 1 && game.players[1].addr == Blockchain.transaction.from)
    {
      game.your_player_id = 1;
    }

    return game;
  }
}

function addScore(contract, game)
{
  addScore(contract, game.players[0].addr, game.winner < 0 ? -1 : game.winner == 0);
  addScore(contract, game.players[1].addr, game.winner < 0 ? -1 : game.winner == 1);
}

function addScore(contract, addr, is_winner)
{
  var score = contract.addr_to_score.get(addr);
  if(!score)
  {
    score = {
      win: 0,
      tie: 0,
      lose: 0
    };
  }

  if(is_winner < 0)
  {
    score.tie++;
  } 
  else if(is_winner == 0)
  {
    score.lose++;
  }
  else
  {
    score.win++;
  }

  contract.addr_to_score.put(addr, score);
}

function removeGameFromPlayerList(contract, addr, game_id)
{
  var game_list = contract.addr_to_game_list.get(addr);
  game_list.splice(game_list.indexOf(game_id));
  contract.addr_to_game_list.put(addr, game_list);
}

function assertIsValidSelection(selection)
{
  return selection == "rock"
    || selection == "lizard"
    || selection == "spock"
    || selection == "scissors"
    || selection == "paper";
}

function getWinner(a, b)
{
  if(a == b)
  {
    return -1;
  }
  if(a == "rock")
  {
    if(b == "lizard" || b == "scissors")
    {
      return 0;
    }
    return 1;
  }
  if(a == "lizard")
  {
    if(b == "paper" || b == "spock")
    {
      return 0;
    }
    return 1;
  }
  if(a == "spock")
  {
    if(b == "rock" || b == "scissors")
    {
      return 0;
    }
    return 1;
  }
  if(a == "scissors")
  {
    if(b == "lizard" || b == "paper")
    {
      return 0;
    }
    return 1;
  }
  if(a == "paper")
  {
    if(b == "rock" || b == "spock")
    {
      return 0;
    }
    return 1;
  }
}

function addPlayerGame(contract, game_id)
{
  var game_list = contract.addr_to_game_list.get(Blockchain.transaction.from);
  if(!game_list)
  {
    game_list = [];
  }
  game_list.push(game_id);
  contract.addr_to_game_list.put(Blockchain.transaction.from, game_list);
}

module.exports = Contract;


//#region sha256
// sha256 from http://geraintluff.github.io/sha256/
var sha256 = function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value>>>amount) | (value<<(32 - amount));
	};
	
	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = 'length'
	var i, j; // Used as a counter across the whole file
	var result = ''

	var words = [];
	var asciiBitLength = ascii[lengthProperty]*8;
	
	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = sha256.h = sha256.h || [];
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = sha256.k = sha256.k || [];
	var primeCounter = k[lengthProperty];
	/*/
	var hash = [], k = [];
	var primeCounter = 0;
	//*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
			k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
		}
	}
	
	ascii += '\x80' // Append Ƈ' bit (plus zero padding)
	while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j>>8) return; // ASCII check: only accept characters in range 0-255
		words[i>>2] |= j << ((3 - i)%4)*8;
	}
	words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
	words[words[lengthProperty]] = (asciiBitLength)
	
	// process each chunk
	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);
		
		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if 
			var w15 = w[i - 15], w2 = w[i - 2];

			// Iterate
			var a = hash[0], e = hash[4];
			var temp1 = hash[7]
				+ (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
				+ ((e&hash[5])^((~e)&hash[6])) // ch
				+ k[i]
				// Expand the message schedule if needed
				+ (w[i] = (i < 16) ? w[i] : (
						w[i - 16]
						+ (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
						+ w[i - 7]
						+ (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
					)|0
				);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
				+ ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj
			
			hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1)|0;
		}
		
		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i])|0;
		}
	}
	
	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i]>>(j*8))&255;
			result += ((b < 16) ? 0 : '') + b.toString(16);
		}
	}
	return result;
};
//#endregion sha256