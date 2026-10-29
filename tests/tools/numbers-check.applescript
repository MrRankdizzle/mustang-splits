-- Reads back a workbook that `open -a Numbers` opened (tests/e2e48.js): its sheets and a few cells, then closes it.
on run argv
  set want to item 1 of argv
  tell application "Numbers"
    set d to missing value
    repeat 60 times
      try
        set d to document want
        exit repeat
      end try
      delay 0.5
    end repeat
    if d is missing value then return "NOT OPEN"
    set out to "sheets=" & (count of sheets of d)
    repeat with k from 1 to (count of sheets of d)
      set sh to sheet k of d
      set out to out & linefeed & "S " & (name of sh) & "|" & (formatted value of cell "A2" of table 1 of sh)
    end repeat
    repeat with i from 2 to (count of argv)
      set {sn, cl} to my splitRef(item i of argv)
      set c to cell cl of table 1 of sheet sn of d
      set out to out & linefeed & "C " & (item i of argv) & "|" & (formatted value of c)
    end repeat
    close d saving no
    return out
  end tell
end run
on splitRef(s)
  set AppleScript's text item delimiters to "!"
  set p to text items of s
  set AppleScript's text item delimiters to ""
  return {item 1 of p, item 2 of p}
end splitRef
