function refreshGames()
{
    nebReadAnon("listPublicGames", null, function(result, error, args)
    { // TODO remove full games from the list
        if(!result)
        {
            $("#join-game-contents").text("Error: " + error);
            return;
        }
        
        if(result.length == 0)
        {
            $("#join-game-contents").text("No games available, start a new one!");
        }
        else
        {
            var html = "";
            for(var i = 0; i < result.length; i++)
            {
                var game_id = result[i];
                html += '<a href="game.html#' + game_id + '">' + formatAddress(game_id) + '</a><br>'; 
            }
            $("#join-game-contents").html(html);
        }
        setTimeout(refreshGames, 15000);
    });
}
refreshGames();
    
    nebRead("getMyGames", null, function(result, error, args)
    {
        if(!result && !error)
        { // You have never played before
            $("#your-games").hide();
    }

    if(!result)
    {
        $("#your-games-contents").text("Error: " + error);
        return;
    }

    if(result.length == 0)
    {
        $("#your-games-contents").text("No games available, start a new one!");
        return;
    }

    var html = "";
    for(var i = 0; i < result.length; i++)
    {
        var game_id = result[i];
        html += '<a href="game.html#' + game_id + '">' + formatAddress(game_id) + '</a><br>'; 
    }
    $("#your-games-contents").html(html);
});