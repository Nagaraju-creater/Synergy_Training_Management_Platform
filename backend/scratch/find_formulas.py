import re

with open('app/analytics/team_analytics_service.py', encoding='utf-8') as f:
    content = f.read()

# Regular expression to match string literals starting with '='
formulas = re.findall(r'"=[^"]*"' or r"'=[^']*'", content)
# Also print lines containing .cell( or [ and '='
lines = content.splitlines()
for i, line in enumerate(lines, 1):
    if '=' in line and ('ws.cell' in line or 'ws[' in line or '_ws.cell' in line or '_ws[' in line or 'summary_ws' in line or 'raw_ws' in line or 'dept_ws' in line or 'month_ws' in line or 'att_ws' in line or 'emp_report_ws' in line):
        print(f"{i}: {line.strip()}")
