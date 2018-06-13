var game;
var secret;
var count = 0;
var interval;

var game_id = window.location.hash.substring(1);
if(!game_id)
{
    showStatus("Error", "Please select a game first.", 3000, redirectToHome());
}

function submit()
{
    if(!currentSelection)
    {
        showStatus("Error", "Please make a selection first.", 3000);
        return;
    }
   
    nebWriteWithStatus("joinGame", [game_id, currentSelection], 0, 
        "Awesome, sit tight... now we wait for your opponent to reveal their selection.",
        function() {window.location.reload()});
}

function getGame()
{
    getSecret(function(my_secret)
    { 
        secret = my_secret;
        nebRead("getGame", [game_id], function(resp, error)
        {
            $("#loading").hide();
            $("#waiting").hide();

            if(error)
            {
                showStatus("Error", error, 3000, redirectToHome);
                return;
            }

            if(resp.winner != null)
            { // Game over
                game = resp;
                $("#player-0-addr").text(formatAddress(game.players[0].addr));
                $("#player-1-addr").text(formatAddress(game.players[1].addr));
                $("#game-over").attr('style', "display:inline-block");
                interval = setInterval(aoeu, 500);
            }
            else if(resp.your_player_id == 0)
            { 
                if(resp.players.length < 2)
                { // Waiting for opponent to join
                    $("#waiting").show();
                    setTimeout(function()
                    {
                        getGame();
                    }, 3000);
                }
                else
                { // Pending reveal
                    game = resp;
                    $("#reveal").show();
                }
            }
            else if(resp.players.length < 2)
            { // Join game
                $("#join-game").show();
            } else 
            { // Waiting for opponent to reveal
                $("#waiting").show();
                setTimeout(function()
                {
                    getGame();
                }, 3000);
            }
        });
    });
}
getGame();

function aoeu()
{
    if(count < options.length - 1)
    {
        restartAnimation();
    }
    count++;
    if(count < options.length)
    {
        var message = titleCase(options[count]);
        $("#game-over-message").text(message + "...");
        if(count == options.length - 1)
        {
            clearInterval(interval);
            interval = setInterval(aoeu, 250);
        }
    }
    else if(count == options.length)
    {
        $("#player-0").attr("src", "images/" + game.players[0].selection + ".svg");
        $("#player-1").attr("src", "images/" + game.players[1].selection + ".svg");
    }
    else 
    {
        var winner_id = game.winner;
        if(winner_id < 0)
        {
            winner_id = 0;
        }
        var winning_selection = game.players[winner_id].selection;
        var losing_selection = game.players[otherPlayer(winner_id)].selection;
        var hit_message;
        if(winning_selection == losing_selection)
        {
            hit_message = "==";
        }
        else
        {
            hit_message = winning_messages[winning_selection][losing_selection];
        }
        $("#game-over-message").text(titleCase(winning_selection)
            + " " + hit_message + " " 
            + titleCase(titleCase(losing_selection)));


        if(game.winner >= 0)
        {
            $("#player-" + otherPlayer(game.winner) + "-x").show();        
        }
        clearInterval(interval);
    }
}

function otherPlayer(id)
{
    return id == 0 ? 1 : 0;
}

function titleCase(message)
{
    return message.charAt(0).toUpperCase() + message.slice(1);
}

function restartAnimation(node)
{
    if(!node)
    {
        restartAnimation($("#player-0"));
        restartAnimation($("#player-1"));
    }
    else
    {
        var newone = node.clone(true);
        node.replaceWith(newone);
    }
}

function reveal()
{
    var selection;
    var salt;

    for(var i = 0; i < options.length; i++)
    {
        selection = options[i]; 
        salt = sha256(secret + game.seed);
        var hash = sha256(salt + selection);
        if(hash == game.players[0].selection_hash)
        {
            break;
        }
    }

    nebWriteWithStatus("endGame", [game_id, selection, salt], 0, null, function(resp, error)
    {
        if(error)
        {
            showStatus("Error", error);
            return;
        }

        window.location.reload();
    });
}

getSecret(function(secret)
{
    $("#secret").val(secret);
});