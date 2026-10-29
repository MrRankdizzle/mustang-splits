-- Reads back a workbook that `open -a "Microsoft Excel"` opened (tests/e2e48.js): sheet names and a few cells, then
-- closes it without saving. A repair prompt would keep the workbook from opening, so the caller times out instead.
on run argv
  set want to item 1 of argv
  tell application "Microsoft Excel"
    set wb to missing value
    repeat 60 times
      try
        set wb to workbook want
        exit repeat
      end try
      delay 0.5
    end repeat
    if wb is missing value then return "NOT OPEN"
    set out to "sheets=" & (count of worksheets of wb)
    repeat with k from 1 to (count of worksheets of wb)
      set ws to worksheet k of wb
      set out to out & linefeed & "S " & (name of ws) & "|" & (string value of (get range "A1" of ws)) & "|" & (string value of (get range "A2" of ws))
    end repeat
    repeat with i from 2 to (count of argv)
      set {sh, cl} to my splitRef(item i of argv)
      set r to range cl of worksheet sh of wb
      set out to out & linefeed & "C " & sh & "!" & cl & "|" & (string value of r) & "|" & (formula of r)
    end repeat
    close wb saving no
    return out
  end tell
end run
on splitRef(s)
  set AppleScript's text item delimiters to "!"
  set p to text items of s
  set AppleScript's text item delimiters to ""
  return {item 1 of p, item 2 of p}
end splitRef
