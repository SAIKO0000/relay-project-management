BEGIN {
  FS = "\t"
  OFS = "\t"
  print "SET session_replication_role = replica;"
}

/^COPY "auth"\."users"/ {
  mode = "auth_users"
  print "COPY \"auth\".\"users\" (\"id\", \"email\", \"raw_user_meta_data\", \"created_at\", \"updated_at\") FROM stdin;"
  next
}

/^COPY / {
  mode = ($0 ~ /^COPY "public"\./ || $0 ~ /^COPY "storage"\."buckets"/ || $0 ~ /^COPY "storage"\."objects"/) ? "copy" : "skip"
  if (mode == "copy") print
  next
}

mode == "auth_users" && $0 == "\\." {
  print
  mode = ""
  next
}

mode == "auth_users" {
  print $2, $5, $18, $20, $21
  next
}

mode == "copy" {
  print
  if ($0 == "\\.") mode = ""
}

END {
  print "SET session_replication_role = DEFAULT;"
}
