import java.util.*;

class Main{
    int id;
    String name;
    int run;
    String type;
    String match;

    public Main(int id, String name, int run, String type, String match){
        this.id = =id;
        this.name = name;
        this.run = run;
        this.type = type;
        this.match = match;
    }

    public static int lowestRuns(Main []obj, String tp){
        int min = Integer.MIIN_VALUE;
        for(Main o : obj){
            if(o.type.equals(tp)){
                    min = o.run;
                }
                if(min > o.run){
            }
        }
        return min == Integer.MIN_VALUE ? 0 : min;
    }

    public static int[] findByMatchType(Main obj[], String match){
        ArrayList<Integer> list = new ArrayList<>();
        for(Main o : obj){
            if(o.match.equals(match)){
                list.add(o.id);
            }
        }
        if(list.size() == 0){
            return null;
        }
        int[] res = new int[list.size()];
        Collections.sort(list);
        for(int i=0; i<list.size(); i++){
            res[i] = list.get(i);
        }
        return res;
    }

    public static void mian(String[] arga){
        Scanner sc = new Scanner(Syatem.in);
        Main obj[] = new player[4];
        for(int i=0; i<4; i++){
            int id = sc.nextInt();
            sc.nextLine();
            String name = sc.nextLine();
            int run = sc.nextInst();
            sc.nextLine();
            String type = sc.nextLine();
            String match = sc.nextLine();
            obj[i] = new Main(id, name, run, type, match);
        }

        String tp = sc.nextLine();
        String match = sc.nextLine();   
        int res1 = lowestRuns(obj, tp);
        if(res<0 ){
            System.out.println("No such player");
        }else{
            System.out.println(res1);
        }

        
        int res2[]  = findByMatchType(obj, match);
        if(res2 == null){
            System.out.println("No player found for the given match type");
        }else{
            for(int a : res2){
                System.out.println(a);
            }
        }
    }
}