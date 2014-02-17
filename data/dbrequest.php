<?php

function escapeJsonString($value) {
    # list from www.json.org: (\b backspace, \f formfeed)
    $escapers = array("\\", "/", "\"", "\n", "\r", "\t", "\x08", "\x0c");
    $replacements = array("\\\\", "\\/", "\\\"", "\\n", "\\r", "\\t", "\\f", "\\b");
    $result = str_replace($escapers, $replacements, $value);
    return $result;
}


# queries
if($_GET['cofr'] && $_GET['year'] && $_GET['continent'] != "'AL'"){
    $sql = "SELECT unhcr.orig_country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.orig_country_code WHERE countries.continent = ".$_GET['continent']." AND unhcr.orig_country_code <> 'XXX' AND unhcr.orig_country_code <> ".$_GET['cofr']." AND unhcr.country_code = ".$_GET['cofr']." AND year=".$_GET['year']." UNION SELECT code,".$_GET['year'].",st_asgeojson(the_geom) AS geojson FROM countries WHERE code =".$_GET['cofr']; #UNION haengt noch die Position des Flow Ursprungslandes und das aktuelle Jahr an (fuer die Buffer Erstellung)
}
else if($_GET['cofo'] && $_GET['year'] && $_GET['continent'] != "'AL'"){
    $sql = "SELECT unhcr.country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.country_code WHERE countries.continent = ".$_GET['continent']." AND unhcr.country_code <> 'XXX' AND unhcr.country_code <> ".$_GET['cofo']." AND unhcr.orig_country_code = ".$_GET['cofo']." AND year=".$_GET['year']." UNION SELECT code,".$_GET['year'].",st_asgeojson(the_geom) AS geojson FROM countries WHERE code = ".$_GET['cofo'];
}
else if($_GET['cofr'] && $_GET['year'] && $_GET['continent'] == "'AL'"){
    $sql = "SELECT unhcr.orig_country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.orig_country_code WHERE unhcr.orig_country_code <> 'XXX' AND unhcr.orig_country_code <> ".$_GET['cofr']." AND unhcr.country_code = ".$_GET['cofr']." AND year=".$_GET['year']." UNION SELECT code,".$_GET['year'].",st_asgeojson(the_geom) AS geojson FROM countries WHERE code =".$_GET['cofr']; #UNION haengt noch die Position des Flow Ursprungslandes und das aktuelle Jahr an (fuer die Buffer Erstellung)
}
else if($_GET['cofo'] && $_GET['year'] && $_GET['continent'] == "'AL'"){
    $sql = "SELECT unhcr.country_code as code, unhcr.total_pop, st_asgeojson(countries.the_geom) AS geojson FROM countries RIGHT JOIN unhcr ON countries.code = unhcr.country_code WHERE unhcr.country_code <> 'XXX' AND unhcr.country_code <> ".$_GET['cofo']." AND unhcr.orig_country_code = ".$_GET['cofo']." AND year=".$_GET['year']." UNION SELECT code,".$_GET['year'].",st_asgeojson(the_geom) AS geojson FROM countries WHERE code = ".$_GET['cofo'];
}
else if($_GET['country']){
    $sql = "SELECT code, st_asgeojson(countries.the_geom) AS geojson FROM countries WHERE code =".$_GET['country'];
}
else if($_GET['countries']){
    $sql = "SELECT code, st_asgeojson(countries.the_geom) AS geojson FROM countries WHERE code IN(".$_GET['countries'].")";
}


# Connect to PostgreSQL database
$conn = pg_connect("dbname='mapugee' user='y' password='x' host='0.0.0.0'");
if (!$conn) {
    echo "Not connected : ".pg_error();
    exit;
}

# Try query or error
$rs = pg_query($conn, $sql);
if (!$rs) {
    echo "An SQL error occured.\n";
    exit;
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
