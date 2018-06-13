function submit()
{
    if(!currentSelection)
    {
        showStatus("Error", "Please make a selection first.", 3000);
        return;
    }

    getSecret(function(secret)
    {
        var public_game = $("#public-game").attr('checked') == "checked";
        var seed = "" + Math.random();
        var salt = sha256(secret + seed);
        var hash = sha256(salt + currentSelection);
        
        nebWriteWithStatus("startGame", [seed, hash, public_game], 0, 
            "Awesome, sit tight... it may be awhile before someone challenges you.", 
        function(resp){redirectToHome("/game.html#" + resp.hash)});
    });
}

getSecret(function(secret)
{
    $("#secret").val(secret);
});