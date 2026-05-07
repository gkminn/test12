export const DEFAULT_LOG = `{"message":"2024-09-01T12:34:56Z INFO user=alice action=login"}`;

export const DEFAULT_VRL = `. = parse_regex!(.message, r'^(?P<ts>\\S+) (?P<level>\\w+) user=(?P<user>\\w+) action=(?P<action>\\w+)$')
.timestamp = parse_timestamp!(.ts, "%+")
del(.ts)
`;
