<?php

# Connect to PostgreSQL database
$conn = pg_connect("dbname='mapugee' user='y' password='x' host='0.0.0.0'");
if (!$conn) {
    echo "Not connected : ".pg_error();
    exit;
}

function escapeJsonString($value) {
    # list from www.json.org: (\b backspace, \f formfeed)
    $escapers = array("\\", "/", "\"", "\n", "\r", "\t", "\x08", "\x0c");
    $replacements = array("\\\\", "\\/", "\\\"", "\\n", "\\r", "\\t", "\\f", "\\b");
    $result = str_replace($escapers, $replacements, $value);
    return $result;
}

function wrapArg($arg){
    return "'".$arg."'";
}

# escape Arguments
if($_GET['cofr']){
    $cofr = wrapArg(pg_escape_string($_GET['cofr']));
}
if($_GET['cofo']){
    $cofo = wrapArg(pg_escape_string($_GET['cofo']));
}
if($_GET['year']){
    $year = wrapArg(pg_escape_string($_GET['year']));
}
if($_GET['continent']){
    $continent =wrapArg(pg_escape_string($_GET['continent']));
}
if($_GET['country']){
    $country = wrapArg(pg_escape_string($_GET['country']));
}
if($_GET['countries']){
    $countries = wrapArg(pg_escape_string($_GET['countries']));
}


# Queries
if($cofr && $year && $continent != "'AL'"){
    $sql = "SELECT unhcr.orig_country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.orig_country_code WHERE countries.continent = ".$continent." AND unhcr.orig_country_code <> 'XXX' AND unhcr.orig_country_code <> ".$cofr." AND unhcr.country_code = ".$cofr." AND year=".$year." UNION SELECT code,".$year.",st_asgeojson(the_geom) AS geojson FROM countries WHERE code =".$cofr; 
}
else if($cofo && $year && $continent != "'AL'"){
    $sql = "SELECT unhcr.country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.country_code WHERE countries.continent = ".$continent." AND unhcr.country_code <> 'XXX' AND unhcr.country_code <> ".$cofo." AND unhcr.orig_country_code = ".$cofo." AND year=".$year." UNION SELECT code,".$year.",st_asgeojson(the_geom) AS geojson FROM countries WHERE code = ".$cofo;
}
else if($cofr && $year && $continent == "'AL'"){
    $sql = "SELECT unhcr.orig_country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.orig_country_code WHERE unhcr.orig_country_code <> 'XXX' AND unhcr.orig_country_code <> ".$cofr." AND unhcr.country_code = ".$cofr." AND year=".$year." UNION SELECT code,".$year.",st_asgeojson(the_geom) AS geojson FROM countries WHERE code =".$cofr; 
}
else if($cofo && $year && $continent == "'AL'"){
    $sql = "SELECT unhcr.country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.country_code WHERE unhcr.country_code <> 'XXX' AND unhcr.country_code <> ".$cofo." AND unhcr.orig_country_code = ".$cofo." AND year=".$year." UNION SELECT code,".$year.",st_asgeojson(the_geom) AS geojson FROM countries WHERE code = ".$cofo;
}
else if($country){
    $sql = "SELECT code, st_asgeojson(countries.the_geom) AS geojson FROM countries WHERE code =".$country;
}
else if($countries){
    $sql = "SELECT code, st_asgeojson(countries.the_geom) AS geojson FROM countries WHERE code IN(".$countries.")";
}

# Try query or error
$rs = pg_query($conn, $sql);
if (!$rs) {
    echo "An SQL error occured.\n";
    exit;
}

# Build GeoJSON
$output    = '';
$rowOutput = '';

while ($row = pg_fetch_assoc($rs)) {
    $rowOutput = (strlen($rowOutput) > 0 ? ',' : '') . '{"type": "Feature", "geometry": ' . $row['geojson'] . ', "properties": {';
    $props = '';
    $id    = '';
    foreach ($row as $key => $val) {
        if ($key != "geojson") {
            $props .= (strlen($props) > 0 ? ',' : '') . '"' . $key . '":"' . escapeJsonString($val) . '"';
        }
        if ($key == "id") {
            $id .= ',"id":"' . escapeJsonString($val) . '"';
        }
    }
    
    $rowOutput .= $props . '}';
    $rowOutput .= $id;
    $rowOutput .= '}';
    $output .= $rowOutput;
}

$output = '{ "type": "FeatureCollection", "features": [ ' . $output . ' ]}';
echo $output;
?>