var currentSelection = null;

function selectIcon(icon)
{
    select(icon.id);
}

function select(selection)
{
    currentSelection = selection;
    for(var i = 0; i < options.length; i++)
    {
        var option = options[i];
        var selected = option == currentSelection;
        if(selected)
        {
            $("#" + option).addClass("selected");
        }
        else
        {
            $("#" + option).removeClass("selected");
        }
    }
}
select(currentSelection);
